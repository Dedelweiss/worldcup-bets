-- Campagnes de pronostics (formulaires thématiques) en base + admin.

create table if not exists public.prediction_campaigns (
  id text primary key,
  label text not null,
  short_label text not null,
  emoji text not null default '🏆',
  theme jsonb not null default '{}'::jsonb,
  intro_title text not null,
  intro_subtitle text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prediction_campaign_questions (
  campaign_id text not null references public.prediction_campaigns (id) on delete cascade,
  question_id text not null,
  sort_order integer not null default 0,
  question_type text not null check (
    question_type in ('team', 'player', 'choice')
  ),
  title text not null,
  subtitle text,
  points_potential integer not null default 0 check (points_potential >= 0),
  required boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  primary key (campaign_id, question_id)
);

create index if not exists prediction_campaign_questions_campaign_sort_idx
  on public.prediction_campaign_questions (campaign_id, sort_order);

alter table public.prediction_campaigns enable row level security;
alter table public.prediction_campaign_questions enable row level security;

drop policy if exists "Prediction campaigns readable" on public.prediction_campaigns;
create policy "Prediction campaigns readable"
  on public.prediction_campaigns for select to authenticated
  using (true);

drop policy if exists "Prediction campaign questions readable" on public.prediction_campaign_questions;
create policy "Prediction campaign questions readable"
  on public.prediction_campaign_questions for select to authenticated
  using (true);

drop policy if exists "Admins manage prediction campaigns" on public.prediction_campaigns;
create policy "Admins manage prediction campaigns"
  on public.prediction_campaigns for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins manage prediction campaign questions" on public.prediction_campaign_questions;
create policy "Admins manage prediction campaign questions"
  on public.prediction_campaign_questions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Seed CDM 2026 (si absent)
-- -----------------------------------------------------------------------------
insert into public.prediction_campaigns (
  id, label, short_label, emoji, theme, intro_title, intro_subtitle, is_active
)
values (
  'wc2026',
  'Coupe du Monde 2026',
  'CDM 2026',
  '🏆',
  '{
    "ambient": "from-emerald-600/20 via-violet-600/15 to-amber-500/10",
    "orbA": "rgba(16, 185, 129, 0.35)",
    "orbB": "rgba(139, 92, 246, 0.3)",
    "accentClass": "text-emerald-400",
    "badgeClass": "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }'::jsonb,
  'Vos pronostics CDM 2026',
  'Répondez une seule fois — vos choix restent verrouillés pour tout le tournoi.',
  true
)
on conflict (id) do nothing;

insert into public.prediction_campaign_questions (
  campaign_id, question_id, sort_order, question_type, title, subtitle,
  points_potential, required, config
)
values
  ('wc2026', 'favorite_team', 1, 'team', 'Quelle est votre équipe favorite ?',
   'Bonus si elle remporte la Coupe du Monde', 100, true,
   '{"requiresFavoriteTeamOpen": true}'::jsonb),
  ('wc2026', 'top_scorer', 2, 'player', 'Qui sera le meilleur buteur ?',
   'Soulier d''or du tournoi', 50, true, '{}'::jsonb),
  ('wc2026', 'top_assister', 3, 'player', 'Qui sera le meilleur passeur ?',
   'Soulier d''argent du tournoi', 40, true, '{}'::jsonb),
  ('wc2026', 'finalist_a', 4, 'team', 'Première finaliste',
   'L''une des deux équipes de la finale', 30, true, '{}'::jsonb),
  ('wc2026', 'finalist_b', 5, 'team', 'Deuxième finaliste',
   'Doit être une équipe différente', 30, true,
   '{"excludeSameTeamAs": "finalist_a"}'::jsonb),
  ('wc2026', 'most_goals_team', 6, 'team', 'Quelle équipe marquera le plus de buts ?',
   'Sur l''ensemble du tournoi', 25, true, '{}'::jsonb),
  ('wc2026', 'total_goals', 7, 'choice', 'Combien de buts au total ?',
   'Tous matchs confondus', 20, true,
   '{"options": [
      {"id": "lt_130", "label": "Moins de 130", "description": "Tournoi plutôt fermé"},
      {"id": "130_150", "label": "Entre 130 et 150", "description": "Fourchette classique"},
      {"id": "gt_150", "label": "Plus de 150", "description": "Festival offensif"}
    ]}'::jsonb)
on conflict (campaign_id, question_id) do nothing;

update public.tournament_config
set active_prediction_campaign = 'wc2026'
where id = 1
  and (active_prediction_campaign is null or active_prediction_campaign = '');

-- -----------------------------------------------------------------------------
-- get_active_prediction_campaign : DB d'abord
-- -----------------------------------------------------------------------------
create or replace function public.get_active_prediction_campaign()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from_config text;
  v_from_active text;
begin
  select active_prediction_campaign into v_from_config
  from public.tournament_config where id = 1;

  select id into v_from_active
  from public.prediction_campaigns
  where is_active = true
  order by updated_at desc
  limit 1;

  return coalesce(v_from_active, v_from_config, 'wc2026');
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_set_active_prediction_campaign
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_active_prediction_campaign(p_campaign_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if not exists (
    select 1 from public.prediction_campaigns where id = p_campaign_id
  ) then
    raise exception 'Campaign not found';
  end if;

  update public.prediction_campaigns set is_active = false where is_active = true;
  update public.prediction_campaigns
  set is_active = true, updated_at = now()
  where id = p_campaign_id;

  update public.tournament_config
  set active_prediction_campaign = p_campaign_id
  where id = 1;
end;
$$;

grant execute on function public.admin_set_active_prediction_campaign(text) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_delete_prediction_campaign
-- -----------------------------------------------------------------------------
create or replace function public.admin_delete_prediction_campaign(p_campaign_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if exists (
    select 1 from public.prediction_campaigns
    where id = p_campaign_id and is_active = true
  ) then
    raise exception 'Cannot delete active campaign';
  end if;

  if exists (
    select 1 from public.tournament_picks where campaign_id = p_campaign_id
  ) then
    raise exception 'Cannot delete campaign with existing picks';
  end if;

  delete from public.prediction_campaigns where id = p_campaign_id;
end;
$$;

grant execute on function public.admin_delete_prediction_campaign(text) to authenticated;

-- -----------------------------------------------------------------------------
-- user_needs_prediction_onboarding : rouvrir si questions obligatoires manquantes
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

  if v_completed is distinct from v_active then
    return true;
  end if;

  if exists (
    select 1
    from public.prediction_campaign_questions q
    where q.campaign_id = v_active
      and q.required = true
      and not exists (
        select 1
        from public.tournament_picks tp
        where tp.user_id = v_user_id
          and tp.campaign_id = v_active
          and tp.question_id = q.question_id
      )
  ) then
    return true;
  end if;

  return false;
end;
$$;

-- -----------------------------------------------------------------------------
-- upsert_tournament_pick : autoriser les réponses manquantes sur campagne active
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
  ) and not public.user_needs_prediction_onboarding() then
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
-- complete_onboarding : valider puis clôturer (y compris nouvelles questions)
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
    onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = v_user_id;
end;
$$;

notify pgrst, 'reload schema';
