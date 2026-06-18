-- Corrige la clôture onboarding : questions applicables, équipe favorite, picks manquants.

-- -----------------------------------------------------------------------------
-- sync_favorite_team_tournament_pick
-- -----------------------------------------------------------------------------
create or replace function public.sync_favorite_team_tournament_pick(
  p_user_id uuid,
  p_campaign text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id integer;
  v_points integer;
  v_has_question boolean;
begin
  select p.favorite_team_id into v_team_id
  from public.profiles p
  where p.id = p_user_id;

  if v_team_id is null then
    return;
  end if;

  select exists (
    select 1
    from public.prediction_campaign_questions q
    where q.campaign_id = p_campaign
      and q.question_id = 'favorite_team'
  ) into v_has_question;

  if not v_has_question then
    return;
  end if;

  select q.points_potential into v_points
  from public.prediction_campaign_questions q
  where q.campaign_id = p_campaign
    and q.question_id = 'favorite_team';

  insert into public.tournament_picks (
    user_id, campaign_id, question_id, answer, points_potential, updated_at
  )
  values (
    p_user_id,
    p_campaign,
    'favorite_team',
    jsonb_build_object('team_id', v_team_id),
    coalesce(v_points, 0),
    now()
  )
  on conflict (user_id, campaign_id, question_id) do update
  set
    answer = excluded.answer,
    updated_at = now();
end;
$$;

-- -----------------------------------------------------------------------------
-- campaign_question_satisfied
-- -----------------------------------------------------------------------------
create or replace function public.campaign_question_satisfied(
  p_user_id uuid,
  p_campaign text,
  p_question_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_question_id = 'favorite_team' then
    if exists (
      select 1 from public.profiles
      where id = p_user_id and favorite_team_id is not null
    ) then
      return true;
    end if;
  end if;

  return exists (
    select 1
    from public.tournament_picks tp
    where tp.user_id = p_user_id
      and tp.campaign_id = p_campaign
      and tp.question_id = p_question_id
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- count_missing_campaign_picks
-- -----------------------------------------------------------------------------
create or replace function public.count_missing_campaign_picks(
  p_user_id uuid,
  p_campaign text
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'prediction_campaign_questions'
  ) then
    select count(*)::integer into v_count
    from public.prediction_campaign_questions q
    where q.campaign_id = p_campaign
      and q.required = true
      and (
        coalesce((q.config->>'requiresFavoriteTeamOpen')::boolean, false) = false
        or public.is_favorite_team_selection_open()
      )
      and not public.campaign_question_satisfied(
        p_user_id, p_campaign, q.question_id
      );
    return v_count;
  end if;

  return 0;
end;
$$;

grant execute on function public.sync_favorite_team_tournament_pick(uuid, text) to authenticated;
grant execute on function public.campaign_question_satisfied(uuid, text, text) to authenticated;
grant execute on function public.count_missing_campaign_picks(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- user_needs_prediction_onboarding
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

  perform public.sync_favorite_team_tournament_pick(v_user_id, v_active);

  return public.count_missing_campaign_picks(v_user_id, v_active) > 0;
end;
$$;

-- -----------------------------------------------------------------------------
-- complete_onboarding
-- -----------------------------------------------------------------------------
create or replace function public.complete_onboarding(
  p_required_question_ids text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_campaign text;
  v_missing integer;
  v_qid text;
  v_legacy_missing integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_campaign := public.get_active_prediction_campaign();

  perform public.sync_favorite_team_tournament_pick(v_user_id, v_campaign);

  v_missing := public.count_missing_campaign_picks(v_user_id, v_campaign);

  if v_missing > 0 then
    raise exception 'Missing required picks';
  end if;

  -- Repli si tables campagne absentes (avant migration 089)
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'prediction_campaign_questions'
  ) and p_required_question_ids is not null then
    foreach v_qid in array p_required_question_ids loop
      if not public.campaign_question_satisfied(v_user_id, v_campaign, v_qid) then
        v_legacy_missing := v_legacy_missing + 1;
      end if;
    end loop;

    if v_legacy_missing > 0 then
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
