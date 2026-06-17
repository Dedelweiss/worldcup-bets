-- Cache effectif CDM (football-data.org) — lu par la page équipe, pas d'appel API au rendu.
alter table public.teams
  add column if not exists squad jsonb,
  add column if not exists squad_synced_at timestamptz,
  add column if not exists coach_name text;

comment on column public.teams.squad is
  'Effectif sélection (JSON) synchronisé depuis football-data.org';
comment on column public.teams.squad_synced_at is
  'Dernière synchro effectif — resync si stale côté cron';
comment on column public.teams.coach_name is
  'Sélectionneur (nom affiché page équipe)';
