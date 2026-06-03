-- Stockage Supabase : photo de profil personnalisée (taille limitée côté bucket)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  204800,
  array['image/webp', 'image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lecture publique (affichage classement, chat, etc.)
drop policy if exists "Profile avatars public read" on storage.objects;
create policy "Profile avatars public read"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');

drop policy if exists "Users upload own profile avatar" on storage.objects;
create policy "Users upload own profile avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-f-]{36}/avatar\.(webp|jpe?g)$'
  );

drop policy if exists "Users update own profile avatar" on storage.objects;
create policy "Users update own profile avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-f-]{36}/avatar\.(webp|jpe?g)$'
  );

drop policy if exists "Users delete own profile avatar" on storage.objects;
create policy "Users delete own profile avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- RPC : enregistrer l’URL publique après upload (vérifie le chemin utilisateur)
-- -----------------------------------------------------------------------------
create or replace function public.set_custom_avatar(p_avatar_url text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_url text;
  v_path_user uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_url := trim(coalesce(p_avatar_url, ''));
  if v_url = '' or char_length(v_url) > 512 then
    raise exception 'URL avatar invalide';
  end if;

  if v_url !~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/profile-avatars/[0-9a-f-]{36}/avatar\.(webp|jpe?g)$' then
    raise exception 'URL avatar invalide';
  end if;

  begin
    v_path_user := (
      regexp_match(
        v_url,
        '/profile-avatars/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'
      )
    )[1]::uuid;
  exception
    when others then
      raise exception 'URL avatar invalide';
  end;

  if v_path_user <> v_user_id then
    raise exception 'URL avatar invalide';
  end if;

  update public.profiles
  set avatar_id = 'custom',
      avatar_url = v_url
  where id = v_user_id;

  return 'custom';
end;
$$;

grant execute on function public.set_custom_avatar(text) to authenticated;

notify pgrst, 'reload schema';
