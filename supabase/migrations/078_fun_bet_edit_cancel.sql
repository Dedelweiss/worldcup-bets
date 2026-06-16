-- Paris fun : modifiables / annulables tant que le marché est ouvert.

create or replace function public.place_fun_bet(
  p_market_id uuid,
  p_outcome text,
  p_odd numeric,
  p_stake numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bet_id uuid;
  v_points integer;
  v_market public.fun_markets%rowtype;
  v_expected_odd numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_outcome not in ('yes', 'no') then
    raise exception 'Invalid outcome';
  end if;

  select * into v_market from public.fun_markets where id = p_market_id;
  if not found then
    raise exception 'Fun market not found';
  end if;

  if v_market.status <> 'open' then
    raise exception 'Fun betting is closed';
  end if;

  v_expected_odd := case when p_outcome = 'yes' then v_market.odd_yes else v_market.odd_no end;

  if abs(p_odd - v_expected_odd) > 0.01 then
    raise exception 'Odds have changed, please refresh';
  end if;

  v_points := public.points_from_odd(p_odd);

  select b.id
  into v_bet_id
  from public.bets b
  where b.user_id = v_user_id
    and b.bet_type = 'fun'
    and b.status = 'pending'
    and (
      b.fun_market_id = p_market_id
      or b.market_id = p_market_id
    )
  limit 1;

  if v_bet_id is not null then
    update public.bets
    set
      selection = jsonb_build_object('outcome', p_outcome, 'fun_market_id', p_market_id),
      odd_at_placement = p_odd,
      potential_payout = v_points,
      fun_market_id = p_market_id,
      market_id = null
    where id = v_bet_id;

    return v_bet_id;
  end if;

  insert into public.bets (
    user_id, match_id, market_id, fun_market_id, bet_type, selection,
    odd_at_placement, stake, potential_payout
  )
  values (
    v_user_id,
    v_market.match_id,
    null,
    p_market_id,
    'fun',
    jsonb_build_object('outcome', p_outcome, 'fun_market_id', p_market_id),
    p_odd,
    0,
    v_points
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

create or replace function public.cancel_pending_bet(p_bet_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bet public.bets%rowtype;
  v_match public.matches%rowtype;
  v_fun_status public.fun_market_status;
  v_fun_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_bet
  from public.bets
  where id = p_bet_id
  for update;

  if not found then
    raise exception 'Bet not found';
  end if;

  if v_bet.user_id <> v_user_id then
    raise exception 'Not allowed';
  end if;

  if v_bet.status <> 'pending' then
    raise exception 'Only pending bets can be cancelled';
  end if;

  if v_bet.bet_type = 'fun' then
    v_fun_id := coalesce(
      v_bet.fun_market_id,
      v_bet.market_id,
      (v_bet.selection ->> 'fun_market_id')::uuid
    );

    if v_fun_id is null then
      raise exception 'Fun market not found';
    end if;

    select status into v_fun_status
    from public.fun_markets
    where id = v_fun_id;

    if not found or v_fun_status <> 'open' then
      raise exception 'Fun betting is closed';
    end if;
  else
    select * into v_match from public.matches where id = v_bet.match_id;
    if not found then
      raise exception 'Match not found';
    end if;

    if v_match.status <> 'scheduled' then
      raise exception 'Betting is closed for this match';
    end if;

    if v_match.kickoff_at <= now() then
      raise exception 'Match has already started';
    end if;

    if v_bet.bet_type not in ('match_result', 'exact_score') then
      raise exception 'Unsupported bet type';
    end if;
  end if;

  if coalesce(v_bet.is_boosted, false) then
    update public.profiles
    set boosts_available = boosts_available + 1
    where id = v_user_id;
  end if;

  delete from public.bets where id = p_bet_id;
end;
$$;

notify pgrst, 'reload schema';
