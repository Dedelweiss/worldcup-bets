-- Auth pseudo + mot de passe (email technique) et avatars prédéfinis

alter table public.profiles
  add column if not exists avatar_id text;

comment on column public.profiles.avatar_id is
  'Identifiant avatar prédéfini (lion, eagle, …). avatar_url est dérivé pour l''affichage.';

-- -----------------------------------------------------------------------------
-- Inscription : pseudo obligatoire, pas de nom réel / email affiché
-- -----------------------------------------------------------------------------
create or replace function public.normalize_avatar_id(p_raw text)
returns text
language plpgsql
immutable
as $$
declare
  v_id text := lower(trim(coalesce(p_raw, '')));
begin
  if v_id in (
    'lion', 'eagle', 'wolf', 'bear', 'fox', 'tiger', 'owl', 'penguin'
  ) then
    return v_id;
  end if;
  return 'lion';
end;
$$;

create or replace function public.avatar_url_from_id(p_avatar_id text)
returns text
language sql
immutable
as $$
  select '/avatars/' || public.normalize_avatar_id(p_avatar_id) || '.svg';
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_avatar_id text;
begin
  v_username := lower(trim(coalesce(
    new.raw_user_meta_data ->> 'username',
    ''
  )));

  if v_username = '' or length(v_username) < 3 or v_username !~ '^[a-z0-9_]+$' then
    v_username := null;
  elsif exists (select 1 from public.profiles where username = v_username) then
    v_username := null;
  end if;

  v_avatar_id := public.normalize_avatar_id(new.raw_user_meta_data ->> 'avatar_id');

  insert into public.profiles (id, username, display_name, avatar_id, avatar_url, points)
  values (
    new.id,
    v_username,
    v_username,
    v_avatar_id,
    public.avatar_url_from_id(v_avatar_id),
    0
  );

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC : choisir un avatar prédéfini
-- -----------------------------------------------------------------------------
create or replace function public.update_avatar(p_avatar_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_avatar_id text;
  v_url text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_avatar_id := public.normalize_avatar_id(p_avatar_id);
  v_url := public.avatar_url_from_id(v_avatar_id);

  update public.profiles
  set avatar_id = v_avatar_id,
      avatar_url = v_url
  where id = v_user_id;

  return v_avatar_id;
end;
$$;

grant execute on function public.update_avatar(text) to authenticated;

notify pgrst, 'reload schema';
