-- Corrige admin_reset_app : Supabase exige une clause WHERE sur les UPDATE.
-- La migration 035 avait retiré « WHERE id IS NOT NULL » sur profiles.

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
  v_badges_deleted bigint;
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

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_badges'
  ) then
    delete from public.user_badges where true;
    get diagnostics v_badges_deleted = row_count;
  else
    v_badges_deleted := 0;
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
  where id is not null;
  get diagnostics v_profiles_reset = row_count;

  return jsonb_build_object(
    'transactions_deleted', v_tx_deleted,
    'bets_deleted', v_bets_deleted,
    'match_comments_deleted', coalesce(v_comments_deleted, 0),
    'fun_markets_deleted', coalesce(v_fun_deleted, 0),
    'user_badges_deleted', coalesce(v_badges_deleted, 0),
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
