-- Un seul pronostic classique par match : 1N2 OU score exact, pas les deux.

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

  if p_bet_type in ('match_result', 'exact_score') then
    if exists (
      select 1 from public.bets
      where user_id = v_user_id
        and match_id = p_match_id
        and bet_type in ('match_result', 'exact_score')
        and status = 'pending'
    ) then
      raise exception 'You already have a classic bet on this match';
    end if;
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
