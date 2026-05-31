-- On Fire (Heat) : 3 matchs gagnants consécutifs → mode On Fire (+1 pt par bon pronostic classique).

alter table public.profiles
  add column if not exists heat_streak integer not null default 0,
  add column if not exists on_fire boolean not null default false,
  add column if not exists last_heat_match_id integer references public.matches (id) on delete set null;

comment on column public.profiles.heat_streak is 'Série de matchs classiques gagnants consécutifs (ordre kickoff).';
comment on column public.profiles.on_fire is 'Actif après 3 victoires classiques consécutives ; +1 pt par victoire tant que actif.';
comment on column public.profiles.last_heat_match_id is 'Dernier match ayant mis à jour la série Heat.';

-- Match précédent dans le calendrier (kickoff, puis id).
create or replace function public.previous_match_id(p_match_id integer)
returns integer
language sql
stable
set search_path = public
as $$
  select m.id
  from public.matches m
  cross join lateral (
    select kickoff_at, id
    from public.matches
    where id = p_match_id
  ) cur
  where (m.kickoff_at, m.id) < (cur.kickoff_at, cur.id)
  order by m.kickoff_at desc, m.id desc
  limit 1;
$$;

-- Bonus +1 si le joueur était déjà On Fire avant ce gain.
create or replace function public.on_fire_bonus(p_user_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select case when coalesce(p.on_fire, false) then 1 else 0 end
  from public.profiles p
  where p.id = p_user_id;
$$;

-- Met à jour la série après un pari classique réglé (un seul pari classique / match / joueur).
create or replace function public.update_classic_heat(
  p_user_id uuid,
  p_match_id integer,
  p_won boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev_match_id integer;
  v_streak integer;
  v_on_fire boolean;
  v_last_match_id integer;
begin
  if p_won then
    v_prev_match_id := public.previous_match_id(p_match_id);

    select heat_streak, on_fire, last_heat_match_id
    into v_streak, v_on_fire, v_last_match_id
    from public.profiles
    where id = p_user_id
    for update;

    if not found then
      return;
    end if;

    if v_prev_match_id is not null
      and (v_last_match_id is null or v_last_match_id <> v_prev_match_id)
    then
      v_streak := 0;
      v_on_fire := false;
    end if;

    v_streak := v_streak + 1;
    if v_streak >= 3 then
      v_on_fire := true;
    end if;

    update public.profiles
    set
      heat_streak = v_streak,
      on_fire = v_on_fire,
      last_heat_match_id = p_match_id
    where id = p_user_id;
  else
    update public.profiles
    set
      heat_streak = 0,
      on_fire = false,
      last_heat_match_id = p_match_id
    where id = p_user_id;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- settle_match : bonus On Fire (+1) sur les gains classiques
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

      perform public.update_classic_heat(v_bet.user_id, p_match_id, true);
      v_won := v_won + 1;
    else
      update public.bets
      set status = 'lost', settled_at = now()
      where id = v_bet.id;
      perform public.update_classic_heat(v_bet.user_id, p_match_id, false);
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
      perform public.update_classic_heat(v_bet.user_id, p_match_id, false);
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

    perform public.update_classic_heat(v_bet.user_id, p_match_id, true);
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
-- Classement : indicateur On Fire
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
  on_fire boolean
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
      coalesce(p.on_fire, false) as on_fire
    from public.profiles p
    left join public.bets b on b.user_id = p.id
    where
      p_league_id is null
      or p.id in (
        select lm.user_id
        from public.league_members lm
        where lm.league_id = p_league_id
      )
    group by p.id, p.display_name, p.username, p.points, p.on_fire
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

-- -----------------------------------------------------------------------------
-- Reset app : signature (boolean, numeric) utilisée par l'admin UI — points + Heat
-- -----------------------------------------------------------------------------
drop function if exists public.admin_reset_app(numeric);
drop function if exists public.admin_reset_app(boolean, numeric);

create or replace function public.admin_reset_app(
  p_delete_matches boolean default false,
  p_starting_balance numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bets_deleted bigint;
  v_tx_deleted bigint;
  v_fun_deleted bigint;
  v_comments_deleted bigint;
  v_matches_reset bigint;
  v_matches_deleted bigint;
  v_profiles_reset bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_starting_balance < 0 then
    raise exception 'Starting points must be >= 0';
  end if;

  delete from public.transactions where true;
  get diagnostics v_tx_deleted = row_count;

  delete from public.bets where true;
  get diagnostics v_bets_deleted = row_count;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'match_comments'
  ) then
    delete from public.match_comments where true;
    get diagnostics v_comments_deleted = row_count;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'fun_markets'
  ) then
    delete from public.fun_markets where true;
    get diagnostics v_fun_deleted = row_count;
  else
    v_fun_deleted := 0;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'bet_markets'
  ) then
    delete from public.bet_markets where true;
  end if;

  if p_delete_matches then
    delete from public.matches where true;
    get diagnostics v_matches_deleted = row_count;
    v_matches_reset := 0;
  else
    update public.matches
    set
      status = 'scheduled',
      home_score = null,
      away_score = null,
      settled_at = null,
      is_golden = false
    where id is not null;
    get diagnostics v_matches_reset = row_count;
    v_matches_deleted := 0;
  end if;

  update public.profiles
  set
    points = p_starting_balance,
    boosts_available = 1,
    heat_streak = 0,
    on_fire = false,
    last_heat_match_id = null
  where id is not null;
  get diagnostics v_profiles_reset = row_count;

  return jsonb_build_object(
    'transactions_deleted', v_tx_deleted,
    'bets_deleted', v_bets_deleted,
    'match_comments_deleted', coalesce(v_comments_deleted, 0),
    'fun_markets_deleted', coalesce(v_fun_deleted, 0),
    'matches_reset', v_matches_reset,
    'matches_deleted', v_matches_deleted,
    'profiles_reset', v_profiles_reset,
    'starting_points', p_starting_balance,
    'starting_balance', p_starting_balance
  );
end;
$$;

grant execute on function public.admin_reset_app(boolean, numeric) to authenticated;

notify pgrst, 'reload schema';
