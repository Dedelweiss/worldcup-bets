-- =============================================================================
-- WC2026 Pool — Calendrier officiel des 72 matchs de poule (groupes A–L)
-- =============================================================================
-- PRÉREQUIS :
--   • migration 011_tournament_groups_stages.sql
--   • supabase/scripts/seed_wc2026_groups.sql (48 équipes en poules)
--
-- Source : calendrier FIFA CDM 2026 (11–27 juin), horaires convertis en UTC (EDT = UTC−4).
-- IDs fixes 2026001–2026072 pour ré-import facile après suppression.
--
-- Usage : Supabase → SQL Editor → Run
--
-- Idempotent :
--   • Ré-exécuter met à jour date, stade, cotes et statut « scheduled » des 72 matchs.
--   • Pour tout recréer après suppression manuelle, décommentez « RESET POULES » ci-dessous.
--
-- Cotes par défaut (à ajuster dans /admin) : 2.50 / 3.20 / 2.80

-- -----------------------------------------------------------------------------
-- RESET POULES (décommenter pour supprimer puis recréer les 72 matchs de poule)
-- -----------------------------------------------------------------------------
-- delete from public.matches
-- where stage = 'group'
--    or id between 2026001 and 2026072;

-- -----------------------------------------------------------------------------
-- Import / mise à jour des matchs
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
  v_home_id integer;
  v_away_id integer;
  v_round text;
  v_count int := 0;
begin
  if not exists (
    select 1 from public.teams where tournament_group_id is not null limit 1
  ) then
    raise exception 'Aucune équipe de poule — exécutez seed_wc2026_groups.sql d''abord.';
  end if;

  for r in
    select *
    from (
      values
        (2026001, 1::smallint, 'A', 1::smallint, 2::smallint, 1::smallint, '2026-06-11 19:00:00+00'::timestamptz, 'Mexico City Stadium'),
        (2026002, 1::smallint, 'A', 3::smallint, 4::smallint, 1::smallint, '2026-06-12 02:00:00+00'::timestamptz, 'Estadio Guadalajara'),
        (2026003, 1::smallint, 'A', 4::smallint, 2::smallint, 2::smallint, '2026-06-18 16:00:00+00'::timestamptz, 'Atlanta Stadium'),
        (2026004, 1::smallint, 'A', 1::smallint, 3::smallint, 2::smallint, '2026-06-19 01:00:00+00'::timestamptz, 'Estadio Guadalajara'),
        (2026005, 1::smallint, 'A', 4::smallint, 1::smallint, 3::smallint, '2026-06-25 01:00:00+00'::timestamptz, 'Mexico City Stadium'),
        (2026006, 1::smallint, 'A', 2::smallint, 3::smallint, 3::smallint, '2026-06-25 01:00:00+00'::timestamptz, 'Estadio Monterrey'),
        (2026007, 2::smallint, 'B', 1::smallint, 2::smallint, 1::smallint, '2026-06-12 19:00:00+00'::timestamptz, 'Toronto Stadium'),
        (2026008, 2::smallint, 'B', 3::smallint, 4::smallint, 1::smallint, '2026-06-13 19:00:00+00'::timestamptz, 'San Francisco Bay Area Stadium'),
        (2026009, 2::smallint, 'B', 4::smallint, 2::smallint, 2::smallint, '2026-06-18 19:00:00+00'::timestamptz, 'Los Angeles Stadium'),
        (2026010, 2::smallint, 'B', 1::smallint, 3::smallint, 2::smallint, '2026-06-18 22:00:00+00'::timestamptz, 'BC Place Vancouver'),
        (2026011, 2::smallint, 'B', 4::smallint, 1::smallint, 3::smallint, '2026-06-24 19:00:00+00'::timestamptz, 'BC Place Vancouver'),
        (2026012, 2::smallint, 'B', 2::smallint, 3::smallint, 3::smallint, '2026-06-24 19:00:00+00'::timestamptz, 'Seattle Stadium'),
        (2026013, 3::smallint, 'C', 3::smallint, 4::smallint, 1::smallint, '2026-06-14 01:00:00+00'::timestamptz, 'Boston Stadium'),
        (2026014, 3::smallint, 'C', 1::smallint, 2::smallint, 1::smallint, '2026-06-13 22:00:00+00'::timestamptz, 'New York New Jersey Stadium'),
        (2026015, 3::smallint, 'C', 4::smallint, 2::smallint, 2::smallint, '2026-06-19 22:00:00+00'::timestamptz, 'Boston Stadium'),
        (2026016, 3::smallint, 'C', 1::smallint, 3::smallint, 2::smallint, '2026-06-20 00:30:00+00'::timestamptz, 'Philadelphia Stadium'),
        (2026017, 3::smallint, 'C', 4::smallint, 1::smallint, 3::smallint, '2026-06-24 22:00:00+00'::timestamptz, 'Miami Stadium'),
        (2026018, 3::smallint, 'C', 2::smallint, 3::smallint, 3::smallint, '2026-06-24 22:00:00+00'::timestamptz, 'Atlanta Stadium'),
        (2026019, 4::smallint, 'D', 1::smallint, 2::smallint, 1::smallint, '2026-06-13 01:00:00+00'::timestamptz, 'Los Angeles Stadium'),
        (2026020, 4::smallint, 'D', 3::smallint, 4::smallint, 1::smallint, '2026-06-13 04:00:00+00'::timestamptz, 'BC Place Vancouver'),
        (2026021, 4::smallint, 'D', 4::smallint, 2::smallint, 2::smallint, '2026-06-20 03:00:00+00'::timestamptz, 'San Francisco Bay Area Stadium'),
        (2026022, 4::smallint, 'D', 1::smallint, 3::smallint, 2::smallint, '2026-06-19 19:00:00+00'::timestamptz, 'Seattle Stadium'),
        (2026023, 4::smallint, 'D', 4::smallint, 1::smallint, 3::smallint, '2026-06-26 02:00:00+00'::timestamptz, 'Los Angeles Stadium'),
        (2026024, 4::smallint, 'D', 2::smallint, 3::smallint, 3::smallint, '2026-06-26 02:00:00+00'::timestamptz, 'San Francisco Bay Area Stadium'),
        (2026025, 5::smallint, 'E', 3::smallint, 4::smallint, 1::smallint, '2026-06-14 23:00:00+00'::timestamptz, 'Philadelphia Stadium'),
        (2026026, 5::smallint, 'E', 1::smallint, 2::smallint, 1::smallint, '2026-06-14 17:00:00+00'::timestamptz, 'Houston Stadium'),
        (2026027, 5::smallint, 'E', 1::smallint, 3::smallint, 2::smallint, '2026-06-20 20:00:00+00'::timestamptz, 'Toronto Stadium'),
        (2026028, 5::smallint, 'E', 4::smallint, 2::smallint, 2::smallint, '2026-06-21 00:00:00+00'::timestamptz, 'Kansas City Stadium'),
        (2026029, 5::smallint, 'E', 2::smallint, 3::smallint, 3::smallint, '2026-06-25 20:00:00+00'::timestamptz, 'Philadelphia Stadium'),
        (2026030, 5::smallint, 'E', 4::smallint, 1::smallint, 3::smallint, '2026-06-25 20:00:00+00'::timestamptz, 'New York New Jersey Stadium'),
        (2026031, 6::smallint, 'F', 1::smallint, 3::smallint, 1::smallint, '2026-06-14 20:00:00+00'::timestamptz, 'Dallas Stadium'),
        (2026032, 6::smallint, 'F', 3::smallint, 4::smallint, 1::smallint, '2026-06-15 02:00:00+00'::timestamptz, 'Estadio Monterrey'),
        (2026033, 6::smallint, 'F', 1::smallint, 3::smallint, 2::smallint, '2026-06-20 17:00:00+00'::timestamptz, 'Houston Stadium'),
        (2026034, 6::smallint, 'F', 4::smallint, 3::smallint, 2::smallint, '2026-06-20 04:00:00+00'::timestamptz, 'Estadio Monterrey'),
        (2026035, 6::smallint, 'F', 3::smallint, 3::smallint, 3::smallint, '2026-06-25 23:00:00+00'::timestamptz, 'Dallas Stadium'),
        (2026036, 6::smallint, 'F', 4::smallint, 1::smallint, 3::smallint, '2026-06-25 23:00:00+00'::timestamptz, 'Kansas City Stadium'),
        (2026037, 7::smallint, 'G', 1::smallint, 2::smallint, 1::smallint, '2026-06-15 19:00:00+00'::timestamptz, 'Seattle Stadium'),
        (2026038, 7::smallint, 'G', 3::smallint, 4::smallint, 1::smallint, '2026-06-16 01:00:00+00'::timestamptz, 'Los Angeles Stadium'),
        (2026039, 7::smallint, 'G', 1::smallint, 3::smallint, 2::smallint, '2026-06-21 19:00:00+00'::timestamptz, 'Los Angeles Stadium'),
        (2026040, 7::smallint, 'G', 4::smallint, 2::smallint, 2::smallint, '2026-06-22 01:00:00+00'::timestamptz, 'BC Place Vancouver'),
        (2026041, 7::smallint, 'G', 2::smallint, 3::smallint, 3::smallint, '2026-06-27 03:00:00+00'::timestamptz, 'Seattle Stadium'),
        (2026042, 7::smallint, 'G', 4::smallint, 1::smallint, 3::smallint, '2026-06-27 03:00:00+00'::timestamptz, 'BC Place Vancouver'),
        (2026043, 8::smallint, 'H', 3::smallint, 4::smallint, 1::smallint, '2026-06-15 22:00:00+00'::timestamptz, 'Miami Stadium'),
        (2026044, 8::smallint, 'H', 1::smallint, 2::smallint, 1::smallint, '2026-06-15 16:00:00+00'::timestamptz, 'Atlanta Stadium'),
        (2026045, 8::smallint, 'H', 4::smallint, 2::smallint, 2::smallint, '2026-06-21 22:00:00+00'::timestamptz, 'Miami Stadium'),
        (2026046, 8::smallint, 'H', 1::smallint, 3::smallint, 2::smallint, '2026-06-21 16:00:00+00'::timestamptz, 'Atlanta Stadium'),
        (2026047, 8::smallint, 'H', 2::smallint, 3::smallint, 3::smallint, '2026-06-27 00:00:00+00'::timestamptz, 'Houston Stadium'),
        (2026048, 8::smallint, 'H', 4::smallint, 1::smallint, 3::smallint, '2026-06-27 00:00:00+00'::timestamptz, 'Estadio Guadalajara'),
        (2026049, 9::smallint, 'I', 1::smallint, 2::smallint, 1::smallint, '2026-06-16 19:00:00+00'::timestamptz, 'New York New Jersey Stadium'),
        (2026050, 9::smallint, 'I', 4::smallint, 3::smallint, 1::smallint, '2026-06-16 22:00:00+00'::timestamptz, 'Boston Stadium'),
        (2026051, 9::smallint, 'I', 3::smallint, 2::smallint, 2::smallint, '2026-06-23 00:00:00+00'::timestamptz, 'New York New Jersey Stadium'),
        (2026052, 9::smallint, 'I', 1::smallint, 4::smallint, 2::smallint, '2026-06-22 21:00:00+00'::timestamptz, 'Philadelphia Stadium'),
        (2026053, 9::smallint, 'I', 3::smallint, 1::smallint, 3::smallint, '2026-06-26 19:00:00+00'::timestamptz, 'Boston Stadium'),
        (2026054, 9::smallint, 'I', 2::smallint, 4::smallint, 3::smallint, '2026-06-26 19:00:00+00'::timestamptz, 'Toronto Stadium'),
        (2026055, 10::smallint, 'J', 1::smallint, 2::smallint, 1::smallint, '2026-06-17 01:00:00+00'::timestamptz, 'Kansas City Stadium'),
        (2026056, 10::smallint, 'J', 3::smallint, 4::smallint, 1::smallint, '2026-06-16 04:00:00+00'::timestamptz, 'San Francisco Bay Area Stadium'),
        (2026057, 10::smallint, 'J', 1::smallint, 3::smallint, 2::smallint, '2026-06-22 17:00:00+00'::timestamptz, 'Dallas Stadium'),
        (2026058, 10::smallint, 'J', 4::smallint, 2::smallint, 2::smallint, '2026-06-23 03:00:00+00'::timestamptz, 'San Francisco Bay Area Stadium'),
        (2026059, 10::smallint, 'J', 2::smallint, 3::smallint, 3::smallint, '2026-06-28 02:00:00+00'::timestamptz, 'Kansas City Stadium'),
        (2026060, 10::smallint, 'J', 4::smallint, 1::smallint, 3::smallint, '2026-06-28 02:00:00+00'::timestamptz, 'Dallas Stadium'),
        (2026061, 11::smallint, 'K', 1::smallint, 2::smallint, 1::smallint, '2026-06-17 17:00:00+00'::timestamptz, 'Houston Stadium'),
        (2026062, 11::smallint, 'K', 3::smallint, 4::smallint, 1::smallint, '2026-06-18 02:00:00+00'::timestamptz, 'Mexico City Stadium'),
        (2026063, 11::smallint, 'K', 1::smallint, 3::smallint, 2::smallint, '2026-06-23 17:00:00+00'::timestamptz, 'Houston Stadium'),
        (2026064, 11::smallint, 'K', 4::smallint, 2::smallint, 2::smallint, '2026-06-24 02:00:00+00'::timestamptz, 'Estadio Guadalajara'),
        (2026065, 11::smallint, 'K', 4::smallint, 1::smallint, 3::smallint, '2026-06-27 23:30:00+00'::timestamptz, 'Miami Stadium'),
        (2026066, 11::smallint, 'K', 2::smallint, 3::smallint, 3::smallint, '2026-06-27 23:30:00+00'::timestamptz, 'Atlanta Stadium'),
        (2026067, 12::smallint, 'L', 3::smallint, 4::smallint, 1::smallint, '2026-06-17 23:00:00+00'::timestamptz, 'Toronto Stadium'),
        (2026068, 12::smallint, 'L', 1::smallint, 2::smallint, 1::smallint, '2026-06-17 20:00:00+00'::timestamptz, 'Dallas Stadium'),
        (2026069, 12::smallint, 'L', 1::smallint, 3::smallint, 2::smallint, '2026-06-23 20:00:00+00'::timestamptz, 'Boston Stadium'),
        (2026070, 12::smallint, 'L', 4::smallint, 2::smallint, 2::smallint, '2026-06-23 23:00:00+00'::timestamptz, 'Toronto Stadium'),
        (2026071, 12::smallint, 'L', 4::smallint, 1::smallint, 3::smallint, '2026-06-27 21:00:00+00'::timestamptz, 'New York New Jersey Stadium'),
        (2026072, 12::smallint, 'L', 2::smallint, 3::smallint, 3::smallint, '2026-06-27 21:00:00+00'::timestamptz, 'Philadelphia Stadium')
    ) as f(
      match_id,
      tournament_group_id,
      group_letter,
      home_pos,
      away_pos,
      matchday,
      kickoff_at,
      venue
    )
  loop
    select id into v_home_id
    from public.teams
    where tournament_group_id = r.tournament_group_id
      and group_position = r.home_pos;

    select id into v_away_id
    from public.teams
    where tournament_group_id = r.tournament_group_id
      and group_position = r.away_pos;

    if v_home_id is null or v_away_id is null then
      raise exception 'Équipe manquante groupe % pos % ou %',
        r.group_letter, r.home_pos, r.away_pos;
    end if;

    v_round := 'Groupe ' || r.group_letter || ' · J' || r.matchday::text;

    insert into public.matches (
      id,
      round,
      status,
      kickoff_at,
      venue,
      home_team_id,
      away_team_id,
      odd_home,
      odd_draw,
      odd_away,
      stage,
      tournament_group_id,
      season
    ) values (
      r.match_id,
      v_round,
      'scheduled',
      r.kickoff_at,
      r.venue,
      v_home_id,
      v_away_id,
      2.50,
      3.20,
      2.80,
      'group',
      r.tournament_group_id,
      2026
    )
    on conflict (id) do update set
      round = excluded.round,
      status = 'scheduled',
      kickoff_at = excluded.kickoff_at,
      venue = excluded.venue,
      home_team_id = excluded.home_team_id,
      away_team_id = excluded.away_team_id,
      odd_home = excluded.odd_home,
      odd_draw = excluded.odd_draw,
      odd_away = excluded.odd_away,
      stage = excluded.stage,
      tournament_group_id = excluded.tournament_group_id,
      home_score = null,
      away_score = null,
      settled_at = null,
      is_golden = false,
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  -- Aligner la séquence d'IDs manuels au-dessus du plus grand ID poule
  perform setval(
    'public.manual_match_id_seq',
    greatest(
      (select coalesce(max(id), 2026072) from public.matches where id between 2026001 and 2026099),
      2026072
    )
  );

  raise notice 'Poules CDM 2026 : % match(s) de poule importés ou mis à jour.', v_count;
end $$;

-- -----------------------------------------------------------------------------
-- Vérification
-- -----------------------------------------------------------------------------
select
  tg.letter as groupe,
  count(m.id) as matchs,
  min(m.kickoff_at) as premier_coup_d_envoi,
  max(m.kickoff_at) as dernier
from public.tournament_groups tg
left join public.matches m
  on m.tournament_group_id = tg.id and m.stage = 'group'
group by tg.id, tg.letter
order by tg.id;

select count(*) as total_matchs_poule
from public.matches
where stage = 'group';

select
  m.id,
  m.round,
  m.kickoff_at at time zone 'Europe/Paris' as kickoff_paris,
  ht.name as domicile,
  at.name as exterieur,
  m.venue
from public.matches m
join public.teams ht on ht.id = m.home_team_id
join public.teams at on at.id = m.away_team_id
where m.stage = 'group'
order by m.kickoff_at, m.id
limit 12;
