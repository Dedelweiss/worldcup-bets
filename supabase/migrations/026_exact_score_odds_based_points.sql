-- Score exact : points liés à la cote du vainqueur implicite (comme le 1N2)

create or replace function public.odd_for_result_side(
  p_odd_home numeric,
  p_odd_draw numeric,
  p_odd_away numeric,
  p_side text
)
returns numeric
language sql
immutable
as $$
  select case p_side
    when 'home' then p_odd_home
    when 'draw' then p_odd_draw
    when 'away' then p_odd_away
    else null
  end;
$$;

-- Tendance = même gain qu'un 1N2 gagnant (cote × 10)
-- Tout pile = ×3 la tendance, ou tendance + 20 pts (le plus favorable)
create or replace function public.exact_score_points(
  p_odd numeric,
  p_precision text
)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  v_base integer;
begin
  if p_odd is null or p_odd < 1.01 then
    if p_precision = 'exact' then
      return 30;
    end if;
    return 10;
  end if;

  v_base := public.points_from_odd(p_odd);

  if p_precision = 'exact' then
    return greatest(v_base * 3, v_base + 20);
  end if;

  return v_base;
end;
$$;

create or replace function public.exact_score_points_tendance(p_odd numeric default null)
returns integer
language sql
immutable
set search_path = public
as $$
  select public.exact_score_points(p_odd, 'tendance');
$$;

create or replace function public.exact_score_points_exact(p_odd numeric default null)
returns integer
language sql
immutable
set search_path = public
as $$
  select public.exact_score_points(p_odd, 'exact');
$$;

-- -----------------------------------------------------------------------------
-- place_bet : score exact avec cote du vainqueur prédit
-- -----------------------------------------------------------------------------
create or replace function public.place_bet(
  p_match_id integer,
  p_bet_type public.bet_type,
  p_selection jsonb,
  p_odd numeric,
  p_stake numeric default null,
  p_use_boost boolean default false
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
  v_boosts int;
  v_match public.matches%rowtype;
  v_selection text;
  v_expected_odd numeric;
  v_home int;
  v_away int;
  v_side text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_use_boost and p_bet_type <> 'match_result' then
    raise exception 'Boost only allowed on classic match bets';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.status <> 'scheduled' then
    raise exception 'Betting is closed for this match';
  end if;

  if v_match.kickoff_at <= now() then
    raise exception 'Match has already started';
  end if;

  if p_bet_type = 'match_result' then
    v_selection := p_selection ->> 'selection';
    if v_selection = 'home' then
      v_expected_odd := v_match.odd_home;
    elsif v_selection = 'draw' then
      v_expected_odd := v_match.odd_draw;
    elsif v_selection = 'away' then
      v_expected_odd := v_match.odd_away;
    else
      raise exception 'Invalid selection';
    end if;

    if v_expected_odd is null then
      raise exception 'Odds not available';
    end if;

    if abs(p_odd - v_expected_odd) > 0.01 then
      raise exception 'Odds have changed, please refresh';
    end if;

    v_points := public.points_from_odd(p_odd);
  elsif p_bet_type = 'exact_score' then
    if p_use_boost then
      raise exception 'Boost only allowed on classic match bets';
    end if;

    v_home := (p_selection ->> 'home')::int;
    v_away := (p_selection ->> 'away')::int;

    if v_home is null or v_away is null or v_home < 0 or v_away < 0 or v_home > 20 or v_away > 20 then
      raise exception 'Invalid exact score';
    end if;

    if exists (
      select 1 from public.bets
      where user_id = v_user_id
        and match_id = p_match_id
        and bet_type = 'exact_score'
        and status = 'pending'
    ) then
      raise exception 'You already have a pending exact score bet on this match';
    end if;

    v_side := public.match_result_side(v_home, v_away);
    v_expected_odd := public.odd_for_result_side(
      v_match.odd_home,
      v_match.odd_draw,
      v_match.odd_away,
      v_side
    );

    if v_expected_odd is null then
      raise exception 'Odds not available for predicted result';
    end if;

    v_points := public.exact_score_points(v_expected_odd, 'exact');
    p_odd := v_expected_odd;
  else
    raise exception 'Unsupported bet type';
  end if;

  if p_use_boost then
    select boosts_available into v_boosts
    from public.profiles
    where id = v_user_id
    for update;

    if not found then
      raise exception 'Profile not found';
    end if;

    if v_boosts < 1 then
      raise exception 'No boost available';
    end if;

    update public.profiles
    set boosts_available = boosts_available - 1
    where id = v_user_id;
  end if;

  insert into public.bets (
    user_id, match_id, bet_type, selection,
    odd_at_placement, stake, potential_payout, is_boosted, score_precision
  )
  values (
    v_user_id, p_match_id, p_bet_type, p_selection,
    p_odd, 0, v_points, coalesce(p_use_boost, false), null
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- settle_match : scores exacts selon cote enregistrée
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
        jsonb_build_object('unit', 'points', 'boosted', v_bet.is_boosted)
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
        'odd', v_bet.odd_at_placement
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
    'exact_score_tendance', v_tendance_won
  );
end;
$$;

notify pgrst, 'reload schema';
