-- =============================================================================
-- WC2026 — Mise à jour phase finale après fin des poules (28 juin 2026)
-- =============================================================================
-- Source : https://coupedumonde2026.net/tableau/ (mis à jour 16 juin 2026)
--
-- • Seizièmes (M73–M88) : équipes qualifiées (IDs tournoi 10010–10057) + cotes
-- • Huitièmes → finale (M89–M104) : calendrier officiel (équipes TBD conservées)
--
-- PRÉREQUIS : seed_wc2026_groups.sql + seed_wc2026_knockout_matches.sql
-- Idempotent : ré-exécutable.
--
-- ⚠️ Utilise les IDs fixes des équipes de poule (pas de recherche par nom :
--     des doublons existent côté football-data).

do $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select *
    from (
      values
        -- Seizièmes — (match_id, home_team_id, away_team_id, kickoff, venue)
        (2026073, 10011, 10014, '2026-06-28 17:00:00+00'::timestamptz, 'SoFi Stadium (Los Angeles)'),
        (2026076, 10018, 10031, '2026-06-29 15:00:00+00'::timestamptz, 'NRG Stadium (Houston)'),
        (2026074, 10026, 10023, '2026-06-29 18:30:00+00'::timestamptz, 'Gillette Stadium (Boston)'),
        (2026075, 10030, 10019, '2026-06-29 23:00:00+00'::timestamptz, 'Estadio BBVA (Monterrey)'),
        (2026078, 10028, 10044, '2026-06-30 15:00:00+00'::timestamptz, 'AT&T Stadium (Dallas)'),
        (2026077, 10042, 10032, '2026-06-30 19:00:00+00'::timestamptz, 'MetLife Stadium (New York)'),
        (2026079, 10010, 10029, '2026-06-30 23:00:00+00'::timestamptz, 'Estadio Azteca (Mexico)'),
        (2026080, 10054, 10051, '2026-07-01 14:00:00+00'::timestamptz, 'Mercedes-Benz Stadium (Atlanta)'),
        (2026082, 10034, 10043, '2026-07-01 18:00:00+00'::timestamptz, 'Lumen Field (Seattle)'),
        (2026081, 10022, 10015, '2026-07-01 22:00:00+00'::timestamptz, 'Levi''s Stadium (San Francisco)'),
        (2026084, 10038, 10048, '2026-07-02 17:00:00+00'::timestamptz, 'SoFi Stadium (Los Angeles)'),
        (2026083, 10050, 10055, '2026-07-03 21:00:00+00'::timestamptz, 'BMO Field (Toronto)'),
        (2026085, 10017, 10047, '2026-07-03 01:00:00+00'::timestamptz, 'BC Place (Vancouver)'),
        (2026088, 10024, 10035, '2026-07-03 16:00:00+00'::timestamptz, 'AT&T Stadium (Dallas)'),
        (2026086, 10046, 10039, '2026-07-04 20:00:00+00'::timestamptz, 'Hard Rock Stadium (Miami)'),
        (2026087, 10053, 10056, '2026-07-03 23:30:00+00'::timestamptz, 'Arrowhead Stadium (Kansas City)'),
        -- Huitièmes → finale (TBD)
        (2026090, 9001, 9002, '2026-07-04 15:00:00+00'::timestamptz, 'NRG Stadium (Houston)'),
        (2026089, 9001, 9002, '2026-07-04 19:00:00+00'::timestamptz, 'Lincoln Financial Field (Philadelphia)'),
        (2026091, 9001, 9002, '2026-07-05 18:00:00+00'::timestamptz, 'MetLife Stadium (New York)'),
        (2026092, 9001, 9002, '2026-07-05 22:00:00+00'::timestamptz, 'Estadio Azteca (Mexico)'),
        (2026093, 9001, 9002, '2026-07-06 17:00:00+00'::timestamptz, 'AT&T Stadium (Dallas)'),
        (2026094, 9001, 9002, '2026-07-06 22:00:00+00'::timestamptz, 'Lumen Field (Seattle)'),
        (2026095, 9001, 9002, '2026-07-07 14:00:00+00'::timestamptz, 'Mercedes-Benz Stadium (Atlanta)'),
        (2026096, 9001, 9002, '2026-07-07 18:00:00+00'::timestamptz, 'BC Place (Vancouver)'),
        (2026097, 9001, 9002, '2026-07-09 18:00:00+00'::timestamptz, 'Gillette Stadium (Boston)'),
        (2026098, 9001, 9002, '2026-07-10 17:00:00+00'::timestamptz, 'SoFi Stadium (Los Angeles)'),
        (2026099, 9001, 9002, '2026-07-11 19:00:00+00'::timestamptz, 'Hard Rock Stadium (Miami)'),
        (2026100, 9001, 9002, '2026-07-11 23:00:00+00'::timestamptz, 'Arrowhead Stadium (Kansas City)'),
        (2026101, 9001, 9002, '2026-07-14 17:00:00+00'::timestamptz, 'AT&T Stadium (Dallas)'),
        (2026102, 9001, 9002, '2026-07-15 17:00:00+00'::timestamptz, 'Mercedes-Benz Stadium (Atlanta)'),
        (2026103, 9001, 9002, '2026-07-18 19:00:00+00'::timestamptz, 'Hard Rock Stadium (Miami)'),
        (2026104, 9001, 9002, '2026-07-19 17:00:00+00'::timestamptz, 'MetLife Stadium (New York)')
    ) as f(match_id, home_team_id, away_team_id, kickoff_at, venue)
  loop
    update public.matches
    set
      home_team_id = r.home_team_id,
      away_team_id = r.away_team_id,
      kickoff_at = r.kickoff_at,
      venue = r.venue,
      status = 'scheduled',
      odd_home = coalesce(odd_home, 2.50),
      odd_draw = coalesce(odd_draw, 3.20),
      odd_away = coalesce(odd_away, 2.80),
      updated_at = now()
    where id = r.match_id;

    v_count := v_count + 1;
  end loop;

  raise notice 'Phase finale CDM 2026 : % match(s) mis à jour (M73–M104).', v_count;
end $$;

-- Vérification
select
  m.id,
  m.stage,
  ht.name as domicile,
  ht.code as code_dom,
  at.name as exterieur,
  at.code as code_ext,
  m.odd_home,
  m.odd_draw,
  m.odd_away,
  m.kickoff_at at time zone 'Europe/Paris' as heure_paris
from public.matches m
join public.teams ht on ht.id = m.home_team_id
join public.teams at on at.id = m.away_team_id
where m.id between 2026073 and 2026104
order by m.kickoff_at;
