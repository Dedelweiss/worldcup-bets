-- Liaison football-data.org (IDs externes, minute de jeu live).

alter table public.teams
  add column if not exists football_data_id integer unique;

comment on column public.teams.football_data_id is
  'ID équipe sur api.football-data.org (compétition WC).';

alter table public.matches
  add column if not exists football_data_id integer unique,
  add column if not exists live_minute smallint,
  add column if not exists live_injury_time smallint,
  add column if not exists odds_synced_at timestamptz;

comment on column public.matches.football_data_id is
  'ID match sur api.football-data.org.';
comment on column public.matches.live_minute is
  'Minute de jeu (football-data.org), null hors direct.';
comment on column public.matches.live_injury_time is
  'Temps additionnel affiché (football-data.org).';

create index if not exists matches_football_data_id_idx
  on public.matches (football_data_id)
  where football_data_id is not null;

notify pgrst, 'reload schema';
