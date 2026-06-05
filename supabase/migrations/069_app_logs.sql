-- Journal applicatif consultable par les admins.

create type public.app_log_level as enum ('debug', 'info', 'warn', 'error');

create table public.app_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  level public.app_log_level not null default 'info',
  source text not null,
  message text not null,
  metadata jsonb,
  user_id uuid references public.profiles (id) on delete set null
);

create index app_logs_created_at_idx on public.app_logs (created_at desc);
create index app_logs_level_idx on public.app_logs (level);
create index app_logs_source_idx on public.app_logs (source);

comment on table public.app_logs is
  'Journal serveur (sync API, admin, IA…) — lecture admin uniquement.';

alter table public.app_logs enable row level security;

create policy app_logs_admin_select on public.app_logs
  for select
  to authenticated
  using (public.is_admin());

-- Insertion serveur (service role bypass RLS) ou via RPC ci-dessous.
create or replace function public.log_app_event(
  p_level public.app_log_level,
  p_source text,
  p_message text,
  p_metadata jsonb default null,
  p_user_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into public.app_logs (level, source, message, metadata, user_id)
  values (
    coalesce(p_level, 'info'::public.app_log_level),
    left(trim(coalesce(p_source, 'app')), 120),
    left(trim(coalesce(p_message, '')), 4000),
    p_metadata,
    p_user_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_app_event(public.app_log_level, text, text, jsonb, uuid) from public;
grant execute on function public.log_app_event(public.app_log_level, text, text, jsonb, uuid) to service_role;

notify pgrst, 'reload schema';
