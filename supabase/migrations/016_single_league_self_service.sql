-- Un joueur ne peut rejoindre/créer qu'une seule ligue par lui-même.
-- L'admin peut ajouter un joueur à plusieurs ligues via admin_set_league_members.

-- -----------------------------------------------------------------------------
-- Créer une ligue (joueur) : interdit si déjà membre d'une ligue
-- -----------------------------------------------------------------------------
create or replace function public.create_private_league(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
  v_base text;
  v_suffix int := 0;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if char_length(trim(p_name)) < 2 then
    raise exception 'League name too short';
  end if;

  if exists (
    select 1 from public.league_members lm where lm.user_id = v_user_id
  ) then
    raise exception
      'Vous êtes déjà dans une ligue. Quittez-la ou demandez à un admin de vous ajouter ailleurs.';
  end if;

  v_base := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := trim(both '-' from v_base);
  if v_base = '' then
    v_base := 'ligue';
  end if;
  v_slug := v_base;

  while exists (select 1 from public.leagues where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  end loop;

  insert into public.leagues (name, slug, created_by)
  values (trim(p_name), v_slug, v_user_id)
  returning id into v_id;

  insert into public.league_members (league_id, user_id)
  values (v_id, v_user_id)
  on conflict do nothing;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Rejoindre par code : une seule ligue (sauf déjà membre de la cible)
-- -----------------------------------------------------------------------------
create or replace function public.join_league_by_invite_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league_id uuid;
  v_user_id uuid := auth.uid();
  v_normalized text := lower(trim(p_code));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_normalized = '' then
    raise exception 'Invite code required';
  end if;

  select l.id into v_league_id
  from public.leagues l
  where lower(l.invite_code) = v_normalized;

  if v_league_id is null then
    raise exception 'Code d''invitation invalide';
  end if;

  if exists (
    select 1
    from public.league_members lm
    where lm.user_id = v_user_id
      and lm.league_id = v_league_id
  ) then
    return v_league_id;
  end if;

  if exists (
    select 1
    from public.league_members lm
    where lm.user_id = v_user_id
  ) then
    raise exception
      'Vous êtes déjà dans une ligue. Seul un administrateur peut vous ajouter à une autre.';
  end if;

  insert into public.league_members (league_id, user_id)
  values (v_league_id, v_user_id);

  return v_league_id;
end;
$$;

notify pgrst, 'reload schema';
