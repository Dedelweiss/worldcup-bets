-- Préparer la CDM : remettre les matchs en état « à venir » + effacer paris/tests (sans supprimer le calendrier).

create or replace function public.admin_prepare_world_cup(
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
  v_comments_deleted bigint;
  v_fun_deleted bigint;
  v_badges_deleted bigint;
  v_matches_prepared bigint;
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

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_badges'
  ) then
    delete from public.user_badges where true;
    get diagnostics v_badges_deleted = row_count;
  else
    v_badges_deleted := 0;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tackles'
  ) then
    delete from public.tackles where true;
  end if;

  update public.matches
  set
    status = 'scheduled',
    home_score = null,
    away_score = null,
    settled_at = null,
    live_minute = null,
    live_injury_time = null,
    suppress_auto_live = false,
    is_golden = false,
    ai_summary = null,
    football_data_id = null,
    odds_synced_at = null,
    odd_home = null,
    odd_draw = null,
    odd_away = null,
    updated_at = now()
  where season = 2026
    and id is not null;
  get diagnostics v_matches_prepared = row_count;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tournament_config'
  ) then
    update public.tournament_config
    set
      world_cup_winner_team_id = null,
      favorite_bonus_settled_at = null
    where id = 1;
  end if;

  update public.profiles
  set
    points = p_starting_balance,
    boosts_available = 1,
    heat_streak = 0,
    on_fire = false,
    last_heat_match_id = null,
    favorite_team_id = null,
    favorite_team_chosen_at = null
  where id is not null
    and coalesce(is_ai, false) = false;
  get diagnostics v_profiles_reset = row_count;

  return jsonb_build_object(
    'bets_deleted', v_bets_deleted,
    'transactions_deleted', v_tx_deleted,
    'match_comments_deleted', coalesce(v_comments_deleted, 0),
    'fun_markets_deleted', coalesce(v_fun_deleted, 0),
    'user_badges_deleted', coalesce(v_badges_deleted, 0),
    'matches_prepared', v_matches_prepared,
    'profiles_reset', v_profiles_reset,
    'starting_points', p_starting_balance
  );
end;
$$;

grant execute on function public.admin_prepare_world_cup(numeric) to authenticated;

notify pgrst, 'reload schema';
