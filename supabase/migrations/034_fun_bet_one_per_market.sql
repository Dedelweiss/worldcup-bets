-- Un seul pari fun en attente par joueur et par marché (non modifiable).

create unique index if not exists bets_one_pending_fun_per_user_market_idx
  on public.bets (user_id, fun_market_id)
  where bet_type = 'fun' and fun_market_id is not null and status = 'pending';

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

  if exists (
    select 1 from public.bets
    where user_id = v_user_id
      and bet_type = 'fun'
      and status = 'pending'
      and (
        fun_market_id = p_market_id
        or market_id = p_market_id
      )
  ) then
    raise exception 'You already have a pending fun bet on this market';
  end if;

  v_expected_odd := case when p_outcome = 'yes' then v_market.odd_yes else v_market.odd_no end;

  if abs(p_odd - v_expected_odd) > 0.01 then
    raise exception 'Odds have changed, please refresh';
  end if;

  v_points := public.points_from_odd(p_odd);

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

notify pgrst, 'reload schema';
