-- Correctif : closes_at manquait dans 082 pour les bases déjà migrées.

alter table public.fun_markets
  add column if not exists closes_at timestamptz;

comment on column public.fun_markets.closes_at is
  'Fin de fenêtre de pari (live_window) — distinct de closed_at (fermeture effective).';

notify pgrst, 'reload schema';
