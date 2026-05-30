-- Ligues visibles pour les membres + invitation joueurs + création par les utilisateurs

-- -----------------------------------------------------------------------------
-- RPC : mes ligues (contourne les soucis RLS en lecture)
-- -----------------------------------------------------------------------------
create or replace function public.get_my_leagues()
returns table (
  id uuid,
  name text,
  slug text,
  invite_code text,
  created_by uuid,
  created_at timestamptz,
  is_creator boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.name,
    l.slug,
    l.invite_code,
    l.created_by,
    l.created_at,
    (l.created_by = auth.uid()) as is_creator
  from public.leagues l
  where l.created_by = auth.uid()
    or exists (
      select 1
      from public.league_members lm
      where lm.league_id = l.id and lm.user_id = auth.uid()
    )
  order by l.name;
$$;

grant execute on function public.get_my_leagues() to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : créer une ligue (tout utilisateur connecté)
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

grant execute on function public.create_private_league(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Admin : ajoute le créateur comme membre à la création
-- -----------------------------------------------------------------------------
create or replace function public.admin_create_league(p_name text)
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
  v_admin_id uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'Admin only';
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
  values (trim(p_name), v_slug, v_admin_id)
  returning id into v_id;

  insert into public.league_members (league_id, user_id)
  values (v_id, v_admin_id)
  on conflict do nothing;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Rejoindre par code (insensible à la casse)
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

  insert into public.league_members (league_id, user_id)
  values (v_league_id, v_user_id)
  on conflict do nothing;

  return v_league_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS : les joueurs peuvent créer une ligue et rejoindre via code
-- -----------------------------------------------------------------------------
drop policy if exists "Leagues insert for admins" on public.leagues;

create policy "Leagues insert for authenticated creators"
  on public.leagues for insert to authenticated
  with check (created_by = auth.uid());

create policy "Leagues insert for admins"
  on public.leagues for insert to authenticated
  with check (public.is_admin());

drop policy if exists "League members insert for admins" on public.league_members;

create policy "League members insert for admins"
  on public.league_members for insert to authenticated
  with check (public.is_admin());

create policy "League members insert self"
  on public.league_members for insert to authenticated
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';
