-- Paris fun : lier bets.fun_market_id → fun_markets (market_id pointait vers bet_markets).

alter table public.bets
  add column if not exists fun_market_id uuid references public.fun_markets (id) on delete cascade;

create index if not exists bets_fun_market_id_idx on public.bets (fun_market_id);

-- Rétrocompat : anciens paris fun stockaient l'id fun_markets dans market_id
update public.bets b
set fun_market_id = b.market_id
where b.bet_type = 'fun'
  and b.fun_market_id is null
  and b.market_id is not null
  and exists (select 1 from public.fun_markets fm where fm.id = b.market_id);

update public.bets b
set fun_market_id = (b.selection ->> 'fun_market_id')::uuid
where b.bet_type = 'fun'
  and b.fun_market_id is null
  and b.selection ? 'fun_market_id'
  and exists (
    select 1 from public.fun_markets fm
    where fm.id = (b.selection ->> 'fun_market_id')::uuid
  );

update public.bets
set market_id = null
where bet_type = 'fun' and fun_market_id is not null;

-- -----------------------------------------------------------------------------
-- place_fun_bet
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- settle_fun_market (golden match ×2 conservé)
-- -----------------------------------------------------------------------------
create or replace function public.settle_fun_market(
  p_market_id uuid,
  p_winning_outcome text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.fun_markets%rowtype;
  v_match public.matches%rowtype;
  v_bet record;
  v_points numeric;
  v_payout numeric;
  v_won int := 0;
  v_lost int := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_winning_outcome not in ('yes', 'no') then
    raise exception 'Invalid winning outcome';
  end if;

  select * into v_market from public.fun_markets where id = p_market_id for update;
  if not found then
    raise exception 'Fun market not found';
  end if;

  select * into v_match from public.matches where id = v_market.match_id;

  for v_bet in
    select * from public.bets
    where
      bet_type = 'fun'
      and status = 'pending'
      and (
        fun_market_id = p_market_id
        or (fun_market_id is null and market_id = p_market_id)
      )
    for update
  loop
    if (v_bet.selection ->> 'outcome') = p_winning_outcome then
      v_payout := public.golden_match_payout(v_bet.potential_payout, coalesce(v_match.is_golden, false));

      select points into v_points from public.profiles where id = v_bet.user_id for update;
      update public.profiles
      set points = points + v_payout
      where id = v_bet.user_id;
      update public.bets set status = 'won', settled_at = now() where id = v_bet.id;
      insert into public.transactions (user_id, type, amount, balance_after, bet_id, metadata)
      values (
        v_bet.user_id,
        'bet_payout',
        v_payout,
        v_points + v_payout,
        v_bet.id,
        jsonb_build_object('unit', 'points', 'golden_match', coalesce(v_match.is_golden, false))
      );
      v_won := v_won + 1;
    else
      update public.bets set status = 'lost', settled_at = now() where id = v_bet.id;
      v_lost := v_lost + 1;
    end if;
  end loop;

  update public.fun_markets
  set status = 'settled', winning_outcome = p_winning_outcome, settled_at = now()
  where id = p_market_id;

  return jsonb_build_object(
    'market_id', p_market_id,
    'bets_won', v_won,
    'bets_lost', v_lost,
    'golden_match', coalesce(v_match.is_golden, false)
  );
end;
$$;

notify pgrst, 'reload schema';
