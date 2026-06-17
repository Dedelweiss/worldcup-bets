-- Classement buteurs CDM (football-data.org /competitions/WC/scorers).
alter table public.tournament_config
  add column if not exists wc_scorers jsonb,
  add column if not exists wc_scorers_synced_at timestamptz;

comment on column public.tournament_config.wc_scorers is
  'Buteurs cumulés au tournoi (API scorers), pas le détail but par but des matchs';
comment on column public.tournament_config.wc_scorers_synced_at is
  'Dernière synchro du classement buteurs';
