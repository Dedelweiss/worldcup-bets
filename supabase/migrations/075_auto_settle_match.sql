-- Clôture automatique des paris quand le score final est confirmé (sync football-data).

create or replace function public.settle_match_internal(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_winner text;
  v_bet record;
  v_user_id uuid;
  v_points numeric;
  v_payout numeric;
  v_heat_bonus integer;
  v_pred_home int;
  v_pred_away int;
  v_won int := 0;
  v_lost int := 0;
  v_exact_won int := 0;
  v_tendance_won int := 0;
  v_tackles jsonb;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.settled_at is not null then
    raise exception 'Match already settled';
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
      v_heat_bonus := public.on_fire_bonus(v_bet.user_id);
      v_payout := v_payout + v_heat_bonus;

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
          'golden_match', v_match.is_golden,
          'on_fire_bonus', v_heat_bonus
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

    v_heat_bonus := public.on_fire_bonus(v_bet.user_id);
    v_payout := v_payout + v_heat_bonus;

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
        'golden_match', v_match.is_golden,
        'on_fire_bonus', v_heat_bonus
      )
    );

    v_won := v_won + 1;
  end loop;

  update public.matches
  set status = 'finished', settled_at = now()
  where id = p_match_id;

  v_tackles := public.resolve_tackles_for_match(p_match_id);

  for v_user_id in
    select distinct user_id
    from public.bets
    where match_id = p_match_id
      and bet_type in ('match_result', 'exact_score')
  loop
    perform public.recompute_classic_heat(v_user_id);
  end loop;

  return jsonb_build_object(
    'match_id', p_match_id,
    'winner', v_winner,
    'bets_won', v_won,
    'bets_lost', v_lost,
    'exact_score_exact', v_exact_won,
    'exact_score_tendance', v_tendance_won,
    'golden_match', v_match.is_golden,
    'tackles', v_tackles
  );
end;
$$;

create or replace function public.settle_match(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  return public.settle_match_internal(p_match_id);
end;
$$;

create or replace function public.auto_settle_match(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_result jsonb;
begin
  select * into v_match from public.matches where id = p_match_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_match.settled_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_settled');
  end if;

  if v_match.home_score is null or v_match.away_score is null then
    return jsonb_build_object('ok', false, 'reason', 'no_score');
  end if;

  if v_match.status is distinct from 'finished' then
    return jsonb_build_object('ok', false, 'reason', 'not_finished');
  end if;

  v_result := public.settle_match_internal(p_match_id);
  return v_result || jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.settle_match_internal(integer) from public;
revoke all on function public.auto_settle_match(integer) from public;
grant execute on function public.auto_settle_match(integer) to service_role;

notify pgrst, 'reload schema';
