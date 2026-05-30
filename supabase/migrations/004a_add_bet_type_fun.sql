-- =============================================================================
-- ÉTAPE 1 — Exécuter CE FICHIER SEUL, cliquer Run, attendre le succès
-- =============================================================================
-- Ensuite seulement : 004_fun_bets_stats_admin.sql (et 006 si besoin)

do $$
begin
  alter type public.bet_type add value 'fun';
exception
  when duplicate_object then null;
end $$;
