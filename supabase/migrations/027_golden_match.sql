-- Golden Match : un seul match « en or » à la fois, gains ×2 à la clôture.

alter table public.matches
  add column if not exists is_golden boolean not null default false;

create unique index if not exists matches_one_golden_idx
  on public.matches ((true))
  where is_golden;

-- Applique le multiplicateur Golden Match (×2) sur un montant de points.
create or replace function public.golden_match_payout(p_base numeric, p_is_golden boolean)
returns numeric
language sql
immutable
as $$
  select case when coalesce(p_is_golden, false) then p_base * 2 else p_base end;
$$;

-- -----------------------------------------------------------------------------
-- admin_update_match : option Golden Match (désigne les autres)
-- -----------------------------------------------------------------------------
create or replace function public.admin_update_match(
  p_match_id integer,
  p_status public.match_status default null,
  p_home_score integer default null,
  p_away_score integer default null,
  p_odd_home numeric default null,
  p_odd_draw numeric default null,
  p_odd_away numeric default null,
  p_round text default null,
  p_venue text default null,
  p_is_golden boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_is_golden is true then
    update public.matches set is_golden = false where is_golden;
  end if;

  update public.matches
  set
    status = coalesce(p_status, status),
    home_score = coalesce(p_home_score, home_score),
    away_score = coalesce(p_away_score, away_score),
    odd_home = coalesce(p_odd_home, odd_home),
    odd_draw = coalesce(p_odd_draw, odd_draw),
    odd_away = coalesce(p_odd_away, odd_away),
    round = coalesce(p_round, round),
    venue = coalesce(p_venue, venue),
    is_golden = case
      when p_is_golden is null then is_golden
      else p_is_golden
    end
  where id = p_match_id;

  if not found then
    raise exception 'Match not found';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- settle_match : ×2 si match golden (après boost joueur)
-- -----------------------------------------------------------------------------
create or replace function public.settle_match(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_winner text;
  v_bet record;
  v_points numeric;
  v_payout numeric;
  v_pred_home int;
  v_pred_away int;
  v_won int := 0;
  v_lost int := 0;
  v_exact_won int := 0;
  v_tendance_won int := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.home_score is null or v_match.away_score is null then
    raise exception 'Final score required';
  end if;

  if v_match.home_score > v_match.away_score then
    v_winner := 'home';
  elsif v_match.home_score < v_match.away_score then
    v_winner := 'away';
  else
    v_winner := 'draw';
  end if;

  for v_bet in
    select * from public.bets
    where match_id = p_match_id and status = 'pending' and bet_type = 'match_result'
    for update
  loop
    if (v_bet.selection ->> 'selection') = v_winner then
      v_payout := v_bet.potential_payout;
      if v_bet.is_boosted then
        v_payout := v_bet.potential_payout * 2;
      end if;
      v_payout := public.golden_match_payout(v_payout, v_match.is_golden);

      select points into v_points from public.profiles where id = v_bet.user_id for update;

      update public.profiles
      set points = points + v_payout
      where id = v_bet.user_id;

      update public.bets
      set status = 'won', settled_at = now()
      where id = v_bet.id;

      insert into public.transactions (user_id, type, amount, balance_after, bet_id, metadata)
      values (
        v_bet.user_id,
        'bet_payout',
        v_payout,
        v_points + v_payout,
        v_bet.id,
        jsonb_build_object(
          'unit', 'points',
          'boosted', v_bet.is_boosted,
          'golden_match', v_match.is_golden
        )
      );

      v_won := v_won + 1;
    else
      update public.bets
      set status = 'lost', settled_at = now()
      where id = v_bet.id;
      v_lost := v_lost + 1;
    end if;
  end loop;

  for v_bet in
    select * from public.bets
    where match_id = p_match_id and status = 'pending' and bet_type = 'exact_score'
    for update
  loop
    v_pred_home := (v_bet.selection ->> 'home')::int;
    v_pred_away := (v_bet.selection ->> 'away')::int;

    if v_pred_home = v_match.home_score and v_pred_away = v_match.away_score then
      v_payout := public.exact_score_points(v_bet.odd_at_placement, 'exact');
      update public.bets
      set
        status = 'won',
        settled_at = now(),
        score_precision = 'exact',
        potential_payout = v_payout
      where id = v_bet.id;
      v_exact_won := v_exact_won + 1;
    elsif public.match_result_side(v_pred_home, v_pred_away)
      = public.match_result_side(v_match.home_score, v_match.away_score) then
      v_payout := public.exact_score_points(v_bet.odd_at_placement, 'tendance');
      update public.bets
      set
        status = 'won',
        settled_at = now(),
        score_precision = 'tendance',
        potential_payout = v_payout
      where id = v_bet.id;
      v_tendance_won := v_tendance_won + 1;
    else
      update public.bets
      set status = 'lost', settled_at = now(), score_precision = null
      where id = v_bet.id;
      v_lost := v_lost + 1;
      continue;
    end if;

    v_payout := public.golden_match_payout(v_payout, v_match.is_golden);

    update public.bets
    set potential_payout = v_payout
    where id = v_bet.id;

    select points into v_points from public.profiles where id = v_bet.user_id for update;

    update public.profiles
    set points = points + v_payout
    where id = v_bet.user_id;

    insert into public.transactions (user_id, type, amount, balance_after, bet_id, metadata)
    values (
      v_bet.user_id,
      'bet_payout',
      v_payout,
      v_points + v_payout,
      v_bet.id,
      jsonb_build_object(
        'unit', 'points',
        'score_precision', (select score_precision from public.bets where id = v_bet.id),
        'odd', v_bet.odd_at_placement,
        'golden_match', v_match.is_golden
      )
    );

    v_won := v_won + 1;
  end loop;

  update public.matches
  set status = 'finished', settled_at = now()
  where id = p_match_id;

  return jsonb_build_object(
    'match_id', p_match_id,
    'winner', v_winner,
    'bets_won', v_won,
    'bets_lost', v_lost,
    'exact_score_exact', v_exact_won,
    'exact_score_tendance', v_tendance_won,
    'golden_match', v_match.is_golden
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- settle_fun_market : ×2 si le match lié est golden
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
    where market_id = p_market_id and status = 'pending' and bet_type = 'fun'
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
