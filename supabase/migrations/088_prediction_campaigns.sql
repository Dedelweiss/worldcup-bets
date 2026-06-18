-- Campagnes de pronostics événementielles (CDM 2026, Euro 2028, …).

alter table public.tournament_config
  add column if not exists active_prediction_campaign text not null default 'wc2026';

comment on column public.tournament_config.active_prediction_campaign is
  'Slug de la campagne de pronostics active (ex. wc2026, euro2028).';

alter table public.profiles
  add column if not exists onboarding_campaign_id text;

comment on column public.profiles.onboarding_campaign_id is
  'Slug de la dernière campagne de pronostics complétée par le joueur.';

alter table public.tournament_picks
  add column if not exists campaign_id text not null default 'wc2026';

-- Nouvelle clé primaire (user × campagne × question)
alter table public.tournament_picks
  drop constraint if exists tournament_picks_pkey;

alter table public.tournament_picks
  add primary key (user_id, campaign_id, question_id);

create index if not exists tournament_picks_campaign_idx
  on public.tournament_picks (campaign_id);

-- -----------------------------------------------------------------------------
-- Campagne active
-- -----------------------------------------------------------------------------
create or replace function public.get_active_prediction_campaign()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select active_prediction_campaign from public.tournament_config where id = 1),
    'wc2026'
  );
$$;

grant execute on function public.get_active_prediction_campaign() to authenticated;

-- -----------------------------------------------------------------------------
-- Le joueur doit-il compléter le questionnaire de la campagne active ?
-- -----------------------------------------------------------------------------
create or replace function public.user_needs_prediction_onboarding()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_active text;
  v_completed text;
  v_is_ai boolean;
begin
  if v_user_id is null then
    return false;
  end if;

  v_active := public.get_active_prediction_campaign();
  if v_active is null or trim(v_active) = '' then
    return false;
  end if;

  select p.onboarding_campaign_id, coalesce(p.is_ai, false)
  into v_completed, v_is_ai
  from public.profiles p
  where p.id = v_user_id;

  if not found or v_is_ai then
    return false;
  end if;

  return v_completed is distinct from v_active;
end;
$$;

grant execute on function public.user_needs_prediction_onboarding() to authenticated;

-- -----------------------------------------------------------------------------
-- upsert_tournament_pick (lié à la campagne active)
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
  v_campaign text;
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

  v_campaign := public.get_active_prediction_campaign();

  if exists (
    select 1 from public.profiles
    where id = v_user_id
      and onboarding_campaign_id is not distinct from v_campaign
  ) then
    raise exception 'Onboarding already completed';
  end if;

  insert into public.tournament_picks (
    user_id, campaign_id, question_id, answer, points_potential, updated_at
  )
  values (
    v_user_id,
    v_campaign,
    trim(p_question_id),
    p_answer,
    greatest(coalesce(p_points_potential, 0), 0),
    now()
  )
  on conflict (user_id, campaign_id, question_id) do update
  set
    answer = excluded.answer,
    points_potential = excluded.points_potential,
    updated_at = now();
end;
$$;

-- -----------------------------------------------------------------------------
-- complete_onboarding (clôture pour la campagne active)
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
  v_campaign text;
  v_qid text;
  v_missing int := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_campaign := public.get_active_prediction_campaign();

  if exists (
    select 1 from public.profiles
    where id = v_user_id
      and onboarding_campaign_id is not distinct from v_campaign
  ) then
    return;
  end if;

  if p_required_question_ids is not null then
    foreach v_qid in array p_required_question_ids loop
      if not exists (
        select 1 from public.tournament_picks
        where user_id = v_user_id
          and campaign_id = v_campaign
          and question_id = v_qid
      ) then
        v_missing := v_missing + 1;
      end if;
    end loop;

    if v_missing > 0 then
      raise exception 'Missing required picks';
    end if;
  end if;

  update public.profiles
  set
    onboarding_campaign_id = v_campaign,
    onboarding_completed_at = now()
  where id = v_user_id;
end;
$$;

-- Joueurs ayant réellement complété : rattacher à wc2026
update public.profiles p
set onboarding_campaign_id = 'wc2026'
where p.onboarding_completed_at is not null
  and p.onboarding_campaign_id is null
  and exists (
    select 1 from public.tournament_picks tp
    where tp.user_id = p.id
  );

-- Réouvrir l'onboarding pour ceux marqués complétés sans aucune réponse enregistrée
update public.profiles p
set
  onboarding_completed_at = null,
  onboarding_campaign_id = null
where not coalesce(p.is_ai, false)
  and p.onboarding_completed_at is not null
  and not exists (
    select 1 from public.tournament_picks tp where tp.user_id = p.id
  );

-- admin_prepare_world_cup : réinitialiser aussi la campagne onboarding
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
    onboarding_completed_at = null,
    onboarding_campaign_id = null
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
