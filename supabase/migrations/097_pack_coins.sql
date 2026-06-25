-- Monnaie dédiée à l'achat de packs (jetons), distincte des points de classement.
-- Les jetons se gagnent au MÊME rythme que les points sur les pronos gagnés,
-- mais l'achat de packs ne débite QUE les jetons (le classement n'est jamais touché).
-- L'admin peut remettre les jetons à zéro.

alter table public.profiles
  add column if not exists pack_coins numeric(12, 2) not null default 0
    check (pack_coins >= 0);

comment on column public.profiles.pack_coins is
  'Jetons pour acheter des packs (gagnés comme les points, débités hors classement)';

-- Initialisation : on crédite les jetons à hauteur des points déjà gagnés.
update public.profiles set pack_coins = greatest(points, 0) where pack_coins = 0;

-- -----------------------------------------------------------------------------
-- settle_match_internal : crédite points (classement) ET pack_coins (jetons).
-- -----------------------------------------------------------------------------
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
  v_base numeric;
  v_heat_bonus integer;
  v_pred_home int;
  v_pred_away int;
  v_closing_odd numeric;
  v_settle_odd numeric;
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

  v_closing_odd := public.odd_for_result_side(
    v_match.closing_odd_home,
    v_match.closing_odd_draw,
    v_match.closing_odd_away,
    v_winner
  );

  for v_bet in
    select * from public.bets
    where match_id = p_match_id and status = 'pending' and bet_type = 'match_result'
    for update
  loop
    if (v_bet.selection ->> 'selection') = v_winner then
      if v_closing_odd is not null and v_closing_odd >= 1.01 then
        v_base := public.points_from_odd(v_closing_odd);
      else
        v_base := v_bet.potential_payout;
      end if;

      v_payout := v_base;
      if v_bet.is_boosted then
        v_payout := v_payout * 2;
      end if;
      v_payout := public.golden_match_payout(v_payout, v_match.is_golden);
      v_heat_bonus := public.on_fire_bonus(v_bet.user_id);
      v_payout := v_payout + v_heat_bonus;

      select points into v_points from public.profiles where id = v_bet.user_id for update;

      update public.profiles
      set points = points + v_payout,
          pack_coins = pack_coins + v_payout
      where id = v_bet.user_id;

      update public.bets
      set status = 'won', settled_at = now(), potential_payout = v_base
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
          'pack_coins', v_payout,
          'odd', coalesce(v_closing_odd, v_bet.odd_at_placement),
          'closing_odds', v_closing_odd is not null,
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

  v_settle_odd := case
    when v_closing_odd is not null and v_closing_odd >= 1.01 then v_closing_odd
    else null
  end;

  for v_bet in
    select * from public.bets
    where match_id = p_match_id and status = 'pending' and bet_type = 'exact_score'
    for update
  loop
    v_pred_home := (v_bet.selection ->> 'home')::int;
    v_pred_away := (v_bet.selection ->> 'away')::int;

    if v_pred_home = v_match.home_score and v_pred_away = v_match.away_score then
      v_payout := public.exact_score_points(coalesce(v_settle_odd, v_bet.odd_at_placement), 'exact');
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
      v_payout := public.exact_score_points(coalesce(v_settle_odd, v_bet.odd_at_placement), 'tendance');
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

    if v_bet.is_boosted then
      v_payout := v_payout * 2;
    end if;

    v_payout := public.golden_match_payout(v_payout, v_match.is_golden);

    update public.bets
    set potential_payout = v_payout
    where id = v_bet.id;

    v_heat_bonus := public.on_fire_bonus(v_bet.user_id);
    v_payout := v_payout + v_heat_bonus;

    select points into v_points from public.profiles where id = v_bet.user_id for update;

    update public.profiles
    set points = points + v_payout,
        pack_coins = pack_coins + v_payout
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
        'pack_coins', v_payout,
        'score_precision', (select score_precision from public.bets where id = v_bet.id),
        'odd', coalesce(v_settle_odd, v_bet.odd_at_placement),
        'closing_odds', v_settle_odd is not null,
        'boosted', v_bet.is_boosted,
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
    'closing_odds', v_closing_odd is not null,
    'tackles', v_tackles
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- buy_pack : débite les JETONS (pack_coins), pas les points de classement.
-- -----------------------------------------------------------------------------
create or replace function public.buy_pack(p_pack_type_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pack public.pack_types%rowtype;
  v_coins numeric;
  v_pack_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_pack from public.pack_types where id = p_pack_type_id;
  if not found or not v_pack.is_active then
    raise exception 'Pack unavailable';
  end if;

  select pack_coins into v_coins from public.profiles where id = v_user_id for update;
  if not found then
    raise exception 'Profile not found';
  end if;

  if v_coins < v_pack.price_points then
    raise exception 'Not enough coins';
  end if;

  update public.profiles
  set pack_coins = pack_coins - v_pack.price_points
  where id = v_user_id;

  insert into public.transactions (user_id, type, amount, balance_after, metadata)
  values (
    v_user_id,
    'pack_purchase',
    -v_pack.price_points,
    v_coins - v_pack.price_points,
    jsonb_build_object('unit', 'pack_coins', 'pack_type_id', p_pack_type_id)
  );

  insert into public.user_packs (user_id, pack_type_id, source)
  values (v_user_id, p_pack_type_id, 'purchase')
  returning id into v_pack_id;

  return v_pack_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_reset_pack_coins : remet les jetons à zéro (tous, ou un joueur).
-- -----------------------------------------------------------------------------
create or replace function public.admin_reset_pack_coins(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_user_id is null then
    update public.profiles set pack_coins = 0;
  else
    update public.profiles set pack_coins = 0 where id = p_user_id;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.admin_reset_pack_coins(uuid) to authenticated;

notify pgrst, 'reload schema';
