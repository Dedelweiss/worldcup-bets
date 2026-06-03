-- Liaison odds-api.io (cotes 1N2) — scores/live restent sur football-data.org.

alter table public.matches
  add column if not exists odds_api_event_id bigint unique;

comment on column public.matches.odds_api_event_id is
  'ID événement sur api.odds-api.io (cotes ML).';

create index if not exists matches_odds_api_event_id_idx
  on public.matches (odds_api_event_id)
  where odds_api_event_id is not null;

notify pgrst, 'reload schema';
