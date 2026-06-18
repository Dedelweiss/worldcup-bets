-- Pronostics tournoi (questionnaire d'inscription) + suivi onboarding.

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.profiles.onboarding_completed_at is
  'Date de fin du questionnaire pronostics (onboarding).';

create table if not exists public.tournament_picks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null,
  answer jsonb not null,
  points_potential integer not null default 0 check (points_potential >= 0),
  points_awarded integer check (points_awarded is null or points_awarded >= 0),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists tournament_picks_user_id_idx
  on public.tournament_picks (user_id);

comment on table public.tournament_picks is
  'Réponses aux pronostics « tout le tournoi » (une fois à l''inscription).';

alter table public.tournament_picks enable row level security;

drop policy if exists "Users read own tournament picks" on public.tournament_picks;
create policy "Users read own tournament picks"
  on public.tournament_picks for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins read all tournament picks" on public.tournament_picks;
create policy "Admins read all tournament picks"
  on public.tournament_picks for select to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- upsert_tournament_pick : enregistre une réponse (tant que onboarding ouvert)
-- -----------------------------------------------------------------------------
create or replace function public.upsert_tournament_pick(
  p_question_id text,
  p_answer jsonb,
  p_points_potential integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_question_id is null or trim(p_question_id) = '' then
    raise exception 'Invalid question';
  end if;

  if p_answer is null or p_answer = 'null'::jsonb then
    raise exception 'Invalid answer';
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_user_id and onboarding_completed_at is not null
  ) then
    raise exception 'Onboarding already completed';
  end if;

  insert into public.tournament_picks (
    user_id, question_id, answer, points_potential, updated_at
  )
  values (
    v_user_id,
    trim(p_question_id),
    p_answer,
    greatest(coalesce(p_points_potential, 0), 0),
    now()
  )
  on conflict (user_id, question_id) do update
  set
    answer = excluded.answer,
    points_potential = excluded.points_potential,
    updated_at = now();
end;
$$;

grant execute on function public.upsert_tournament_pick(text, jsonb, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- complete_onboarding : valide les réponses requises et clôture le parcours
-- -----------------------------------------------------------------------------
create or replace function public.complete_onboarding(
  p_required_question_ids text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_qid text;
  v_missing int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_user_id and onboarding_completed_at is not null
  ) then
    return;
  end if;

  if p_required_question_ids is not null then
    foreach v_qid in array p_required_question_ids loop
      if not exists (
        select 1 from public.tournament_picks
        where user_id = v_user_id and question_id = v_qid
      ) then
        v_missing := coalesce(v_missing, 0) + 1;
      end if;
    end loop;

    if coalesce(v_missing, 0) > 0 then
      raise exception 'Missing required picks';
    end if;
  end if;

  update public.profiles
  set onboarding_completed_at = now()
  where id = v_user_id;
end;
$$;

grant execute on function public.complete_onboarding(text[]) to authenticated;

-- Joueurs déjà inscrits : considérés comme ayant terminé l'onboarding.
update public.profiles
set onboarding_completed_at = coalesce(favorite_team_chosen_at, created_at, now())
where onboarding_completed_at is null;

-- -----------------------------------------------------------------------------
-- admin_prepare_world_cup : réinitialiser pronostics tournoi
-- -----------------------------------------------------------------------------
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
  v_picks_deleted bigint;
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

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tournament_picks'
  ) then
    delete from public.tournament_picks where true;
    get diagnostics v_picks_deleted = row_count;
  else
    v_picks_deleted := 0;
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
    favorite_team_chosen_at = null,
    onboarding_completed_at = null
  where id is not null;
  get diagnostics v_profiles_reset = row_count;

  return jsonb_build_object(
    'bets_deleted', v_bets_deleted,
    'transactions_deleted', v_tx_deleted,
    'match_comments_deleted', coalesce(v_comments_deleted, 0),
    'fun_markets_deleted', coalesce(v_fun_deleted, 0),
    'user_badges_deleted', coalesce(v_badges_deleted, 0),
    'tournament_picks_deleted', coalesce(v_picks_deleted, 0),
    'matches_prepared', v_matches_prepared,
    'profiles_reset', v_profiles_reset,
    'starting_points', p_starting_balance
  );
end;
$$;

notify pgrst, 'reload schema';
