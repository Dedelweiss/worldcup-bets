-- Admin : scores saisis → match en direct automatiquement.
-- On Fire : recalcul fiable de la série depuis les matchs terminés (ordre kickoff).

-- -----------------------------------------------------------------------------
-- admin_update_match : passe en « live » si les deux scores sont renseignés
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
declare
  v_row public.matches%rowtype;
  v_home integer;
  v_away integer;
  v_status public.match_status;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_row from public.matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  if p_is_golden is true then
    update public.matches set is_golden = false where is_golden and id <> p_match_id;
  end if;

  v_home := coalesce(p_home_score, v_row.home_score);
  v_away := coalesce(p_away_score, v_row.away_score);
  v_status := coalesce(p_status, v_row.status);

  if v_home is not null
    and v_away is not null
    and v_status not in ('finished', 'cancelled', 'postponed')
  then
    v_status := 'live';
  end if;

  update public.matches
  set
    status = v_status,
    home_score = v_home,
    away_score = v_away,
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
end;
$$;

-- -----------------------------------------------------------------------------
-- On Fire : recalcul complet (matchs terminés, ordre calendrier)
-- -----------------------------------------------------------------------------
create or replace function public.recompute_classic_heat(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  v_streak integer := 0;
  v_on_fire boolean := false;
  v_last_match_id integer;
  v_outcome text;
begin
  for m in
    select id
    from public.matches
    where status = 'finished'
    order by kickoff_at asc, id asc
  loop
    select case
      when exists (
        select 1 from public.bets b
        where b.match_id = m.id
          and b.user_id = p_user_id
          and b.bet_type in ('match_result', 'exact_score')
          and b.status = 'won'
      ) then 'won'
      when exists (
        select 1 from public.bets b
        where b.match_id = m.id
          and b.user_id = p_user_id
          and b.bet_type in ('match_result', 'exact_score')
          and b.status = 'lost'
      ) then 'lost'
      else 'skip'
    end into v_outcome;

    if v_outcome = 'skip' then
      continue;
    end if;

    v_last_match_id := m.id;

    if v_outcome = 'lost' then
      v_streak := 0;
      v_on_fire := false;
    else
      v_streak := v_streak + 1;
      if v_streak >= 3 then
        v_on_fire := true;
      end if;
    end if;
  end loop;

  update public.profiles
  set
    heat_streak = v_streak,
    on_fire = v_on_fire,
    last_heat_match_id = v_last_match_id
  where id = p_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- settle_match : bonus On Fire + recalcul Heat après clôture
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
    'golden_match', v_match.is_golden
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Classement : on_fire + heat_streak (flamme / série en cours)
-- -----------------------------------------------------------------------------
drop function if exists public.get_leaderboard_filtered(uuid, text);

create or replace function public.get_leaderboard_filtered(
  p_league_id uuid default null,
  p_sort_by text default 'points'
)
returns table (
  id uuid,
  display_name text,
  username text,
  balance numeric,
  classic_won bigint,
  classic_lost bigint,
  fun_won bigint,
  fun_lost bigint,
  total_won bigint,
  total_lost bigint,
  on_fire boolean,
  heat_streak integer
)
language sql
stable
security definer
set search_path = public
as $$
  with stats as (
    select
      p.id,
      p.display_name,
      p.username,
      p.points as balance,
      coalesce(
        sum(
          case
            when b.bet_type in ('match_result', 'exact_score', 'goalscorer')
              and b.status = 'won'
            then 1
            else 0
          end
        ),
        0
      )::bigint as classic_won,
      coalesce(
        sum(
          case
            when b.bet_type in ('match_result', 'exact_score', 'goalscorer')
              and b.status = 'lost'
            then 1
            else 0
          end
        ),
        0
      )::bigint as classic_lost,
      coalesce(
        sum(case when b.bet_type = 'fun' and b.status = 'won' then 1 else 0 end),
        0
      )::bigint as fun_won,
      coalesce(
        sum(case when b.bet_type = 'fun' and b.status = 'lost' then 1 else 0 end),
        0
      )::bigint as fun_lost,
      coalesce(sum(case when b.status = 'won' then 1 else 0 end), 0)::bigint as total_won,
      coalesce(sum(case when b.status = 'lost' then 1 else 0 end), 0)::bigint as total_lost,
      coalesce(p.on_fire, false) as on_fire,
      coalesce(p.heat_streak, 0) as heat_streak
    from public.profiles p
    left join public.bets b on b.user_id = p.id
    where
      p_league_id is null
      or p.id in (
        select lm.user_id
        from public.league_members lm
        where lm.league_id = p_league_id
      )
    group by p.id, p.display_name, p.username, p.points, p.on_fire, p.heat_streak
  )
  select *
  from stats
  order by
    case coalesce(p_sort_by, 'points')
      when 'classic_won' then classic_won
      when 'fun_won' then fun_won
      when 'balance' then balance
      else balance
    end desc nulls last,
    balance desc,
    total_won desc;
$$;

grant execute on function public.get_leaderboard_filtered(uuid, text) to authenticated;

notify pgrst, 'reload schema';
