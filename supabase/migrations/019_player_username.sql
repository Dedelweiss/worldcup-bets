-- Pseudos joueurs : username unique + RPC de mise à jour

-- -----------------------------------------------------------------------------
-- Inscription : enregistrer le pseudo (metadata username)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_display text;
begin
  v_username := lower(trim(coalesce(
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'full_name',
    ''
  )));
  if v_username = '' then
    v_username := null;
  elsif length(v_username) < 3 then
    v_username := null;
  elsif v_username !~ '^[a-z0-9_]+$' then
    v_username := null;
  elsif exists (select 1 from public.profiles where username = v_username) then
    v_username := null;
  end if;

  v_display := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    v_username,
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, username, display_name, avatar_url, points)
  values (
    new.id,
    v_username,
    v_display,
    new.raw_user_meta_data ->> 'avatar_url',
    0
  );

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC : choisir / modifier son pseudo
-- -----------------------------------------------------------------------------
create or replace function public.update_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_normalized text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_normalized := lower(trim(p_username));

  if char_length(v_normalized) < 3 then
    raise exception 'Le pseudo doit contenir au moins 3 caractères';
  end if;

  if char_length(v_normalized) > 20 then
    raise exception 'Le pseudo ne peut pas dépasser 20 caractères';
  end if;

  if v_normalized !~ '^[a-z0-9_]+$' then
    raise exception 'Uniquement lettres minuscules, chiffres et underscore (_)';
  end if;

  if exists (
    select 1 from public.profiles
    where username = v_normalized and id <> v_user_id
  ) then
    raise exception 'Ce pseudo est déjà pris';
  end if;

  update public.profiles
  set username = v_normalized
  where id = v_user_id;

  return v_normalized;
end;
$$;

grant execute on function public.update_username(text) to authenticated;

notify pgrst, 'reload schema';
