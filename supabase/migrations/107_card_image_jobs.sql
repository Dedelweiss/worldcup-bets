-- File d'attente génération d'images IA pour les cartes + bucket Storage.

create type public.card_image_job_status as enum (
  'queued',
  'generating',
  'ready',
  'approved',
  'failed',
  'cancelled'
);

alter table public.tournament_config
  add column if not exists card_image_daily_quota integer not null default 20
    check (card_image_daily_quota >= 0);

comment on column public.tournament_config.card_image_daily_quota is
  'Nombre max de jobs image créés par jour (0 = illimité, fuseau Europe/Paris).';

create table if not exists public.card_image_jobs (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  status public.card_image_job_status not null default 'queued',
  prompt text not null,
  leonardo_generation_id text,
  preview_url text,
  preview_storage_path text,
  error_message text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists card_image_jobs_card_id_idx
  on public.card_image_jobs (card_id, created_at desc);

create index if not exists card_image_jobs_status_idx
  on public.card_image_jobs (status, created_at);

create unique index if not exists card_image_jobs_one_active_per_card
  on public.card_image_jobs (card_id)
  where status in ('queued', 'generating', 'ready');

alter table public.card_image_jobs enable row level security;

drop policy if exists "Admins read card image jobs" on public.card_image_jobs;
create policy "Admins read card image jobs"
  on public.card_image_jobs for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins insert card image jobs" on public.card_image_jobs;
create policy "Admins insert card image jobs"
  on public.card_image_jobs for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update card image jobs" on public.card_image_jobs;
create policy "Admins update card image jobs"
  on public.card_image_jobs for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Bucket public (lecture CDN) ; écriture via service role côté serveur.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  true,
  1048576,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Card images public read" on storage.objects;
create policy "Card images public read"
  on storage.objects for select
  using (bucket_id = 'card-images');

create or replace function public.card_image_jobs_created_today()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.card_image_jobs j
  where (j.created_at at time zone 'Europe/Paris')::date
    = (now() at time zone 'Europe/Paris')::date;
$$;

create or replace function public.get_card_image_daily_quota()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used integer;
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  v_limit := coalesce(
    (select card_image_daily_quota from public.tournament_config where id = 1),
    20
  );
  v_used := public.card_image_jobs_created_today();

  return jsonb_build_object(
    'limit', v_limit,
    'used', v_used,
    'remaining', case when v_limit = 0 then null else greatest(0, v_limit - v_used) end,
    'unlimited', v_limit = 0,
    'expires_at', ((v_today + 1)::timestamp at time zone 'Europe/Paris')
  );
end;
$$;

create or replace function public.admin_set_card_image_daily_quota(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_limit is null or p_limit < 0 then
    raise exception 'Limit must be >= 0 (0 = unlimited)';
  end if;

  v_limit := p_limit;

  update public.tournament_config
  set card_image_daily_quota = v_limit
  where id = 1;

  if not found then
    raise exception 'Tournament config not found';
  end if;

  return v_limit;
end;
$$;

grant execute on function public.card_image_jobs_created_today() to authenticated;
grant execute on function public.get_card_image_daily_quota() to authenticated;
grant execute on function public.admin_set_card_image_daily_quota(integer) to authenticated;

notify pgrst, 'reload schema';
