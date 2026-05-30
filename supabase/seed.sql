-- Données de démo (à exécuter après 001_initial_schema.sql)
-- Dashboard : matchs à venir avec cotes 1N2

insert into public.teams (id, name, code, logo_url) values
  (16, 'Mexique', 'MEX', 'https://media.api-sports.io/football/teams/16.png'),
  (1531, 'Afrique du Sud', 'RSA', 'https://media.api-sports.io/football/teams/1531.png'),
  (2384, 'États-Unis', 'USA', 'https://media.api-sports.io/football/teams/2384.png'),
  (2380, 'Paraguay', 'PAR', 'https://media.api-sports.io/football/teams/2380.png'),
  (5529, 'Canada', 'CAN', 'https://media.api-sports.io/football/teams/5529.png'),
  (1569, 'Qatar', 'QAT', 'https://media.api-sports.io/football/teams/1569.png')
on conflict (id) do update set
  name = excluded.name,
  code = excluded.code,
  logo_url = excluded.logo_url;

insert into public.matches (
  id, round, status, kickoff_at, venue,
  home_team_id, away_team_id,
  odd_home, odd_draw, odd_away
) values
  (
    1001, 'Groupe A · J1', 'scheduled', '2026-06-11 19:00:00+00',
    'Estadio Azteca, Mexico City', 16, 1531, 2.10, 3.20, 3.50
  ),
  (
    1002, 'Groupe A · J1', 'scheduled', '2026-06-12 01:00:00+00',
    'SoFi Stadium, Los Angeles', 2384, 2380, 1.45, 4.50, 7.00
  ),
  (
    1003, 'Groupe B · J1', 'scheduled', '2026-06-12 18:00:00+00',
    'BMO Field, Toronto', 5529, 1569, 1.85, 3.40, 4.20
  )
on conflict (id) do update set
  round = excluded.round,
  kickoff_at = excluded.kickoff_at,
  odd_home = excluded.odd_home,
  odd_draw = excluded.odd_draw,
  odd_away = excluded.odd_away;
