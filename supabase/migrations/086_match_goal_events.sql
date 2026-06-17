alter table public.matches
  add column if not exists goal_events jsonb,
  add column if not exists goal_events_synced_at timestamptz,
  add column if not exists goal_events_source text;

comment on column public.matches.goal_events is
  'Buts du match (minute, buteur, passe, score) — cache enrichissement post-match/live';
comment on column public.matches.goal_events_source is
  'native-stats | wikipedia';
