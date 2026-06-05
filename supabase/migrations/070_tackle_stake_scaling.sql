-- Tacle Glissé : enjeu proportionnel au pari / à la cote (plus 5–50 pts, plus 3 fixes).

create or replace function public.tackle_stake_for_user(
  p_user_id uuid,
  p_match_id integer
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_max_payout numeric := 0;
  v_max_odd numeric := 0;
begin
  select
    coalesce(max(b.potential_payout), 0),
    coalesce(max(b.odd_at_placement), 0)
  into v_max_payout, v_max_odd
  from public.bets b
  where b.user_id = p_user_id
    and b.match_id = p_match_id
    and b.bet_type in ('match_result', 'exact_score');

  if v_max_payout < 1 and v_max_odd >= 1.01 then
    v_max_payout := public.points_from_odd(v_max_odd);
  end if;

  if v_max_payout < 1 then
    return 5;
  end if;

  return greatest(5, least(50, round(v_max_payout * 0.30)::integer));
end;
$$;

comment on function public.tackle_stake_for_user(uuid, integer) is
  'Enjeu du tacle : 30 % du gain potentiel du pari classique (min 5, max 50 pts).';

create or replace function public.resolve_tackles_for_match(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tackle record;
  v_attacker_pts numeric;
  v_target_pts numeric;
  v_win_stake integer;
  v_fail_stake integer;
  v_resolved int := 0;
  v_success int := 0;
  v_failed int := 0;
begin
  for v_tackle in
    select *
    from public.tackles
    where match_id = p_match_id and not is_resolved
    for update
  loop
    v_attacker_pts := public.match_classic_points_earned(v_tackle.attacker_id, p_match_id);
    v_target_pts := public.match_classic_points_earned(v_tackle.target_id, p_match_id);
    v_win_stake := public.tackle_stake_for_user(v_tackle.target_id, p_match_id);
    v_fail_stake := public.tackle_stake_for_user(v_tackle.attacker_id, p_match_id);

    if v_attacker_pts > v_target_pts then
      perform public.apply_tackle_points(
        v_tackle.attacker_id,
        v_win_stake,
        v_tackle.id,
        p_match_id,
        'tackle_bonus'
      );
      perform public.apply_tackle_points(
        v_tackle.target_id,
        -v_win_stake,
        v_tackle.id,
        p_match_id,
        'tackle_penalty'
      );

      update public.tackles
      set
        is_resolved = true,
        attacker_won = true,
        attacker_delta = v_win_stake,
        target_delta = -v_win_stake
      where id = v_tackle.id;

      v_success := v_success + 1;
    else
      perform public.apply_tackle_points(
        v_tackle.attacker_id,
        -v_fail_stake,
        v_tackle.id,
        p_match_id,
        'tackle_penalty'
      );

      update public.tackles
      set
        is_resolved = true,
        attacker_won = false,
        attacker_delta = -v_fail_stake,
        target_delta = 0
      where id = v_tackle.id;

      v_failed := v_failed + 1;
    end if;

    v_resolved := v_resolved + 1;
  end loop;

  return jsonb_build_object(
    'match_id', p_match_id,
    'tackles_resolved', v_resolved,
    'tackles_success', v_success,
    'tackles_failed', v_failed
  );
end;
$$;

notify pgrst, 'reload schema';
