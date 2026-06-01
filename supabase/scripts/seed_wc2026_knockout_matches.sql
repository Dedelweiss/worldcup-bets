-- =============================================================================
-- WC2026 Pool — Calendrier phase finale (32es → finale, matchs FIFA 73–104)
-- =============================================================================
-- PRÉREQUIS : seed_wc2026_groups.sql (équipes de poule)
--
-- IDs fixes : 2026073 (= M73) … 2026104 (= M104)
-- Ré-exécutable (ON CONFLICT). Décommenter RESET pour tout supprimer avant réimport.

-- -----------------------------------------------------------------------------
-- RESET phase finale (décommenter si besoin)
-- -----------------------------------------------------------------------------
-- delete from public.matches where id between 2026073 and 2026104;

insert into public.teams (id, name, code, logo_url)
values
  (9001, 'À déterminer (dom.)', 'TBD', null),
  (9002, 'À déterminer (ext.)', 'TBD', null)
on conflict (id) do update set
  name = excluded.name,
  code = excluded.code;

do $$
declare
  r record;
  v_round text;
  v_stage public.match_stage;
  v_count int := 0;
  v_slot_id uuid;
begin
  for r in
    select *
    from (
      values
        (2026073, 73, 'r32', '2e A v 2e B', '2026-06-28 19:00:00+00'::timestamptz, 'Los Angeles Stadium', null),
        (2026074, 74, 'r32', '1er E v 3e (A/B/C/D/F)', '2026-06-30 00:30:00+00'::timestamptz, 'Boston Stadium', null),
        (2026075, 75, 'r32', '1er F v 2e C', '2026-06-30 00:00:00+00'::timestamptz, 'Estadio Monterrey', null),
        (2026076, 76, 'r32', '1er C v 2e F', '2026-06-29 17:00:00+00'::timestamptz, 'Houston Stadium', null),
        (2026077, 77, 'r32', '1er I v 3e (C/D/F/G/H)', '2026-06-30 21:00:00+00'::timestamptz, 'New York New Jersey Stadium', null),
        (2026078, 78, 'r32', '2e E v 2e I', '2026-06-30 17:00:00+00'::timestamptz, 'Dallas Stadium', null),
        (2026079, 79, 'r32', '1er A v 3e (C/E/F/H/I)', '2026-07-01 01:00:00+00'::timestamptz, 'Mexico City Stadium', null),
        (2026080, 80, 'r32', '1er L v 3e (E/H/I/J/K)', '2026-07-01 16:00:00+00'::timestamptz, 'Atlanta Stadium', null),
        (2026081, 81, 'r32', '1er D v 3e (B/E/F/I/J)', '2026-07-01 20:00:00+00'::timestamptz, 'San Francisco Bay Area Stadium', null),
        (2026082, 82, 'r32', '1er G v 3e (A/E/H/I/J)', '2026-07-02 00:00:00+00'::timestamptz, 'Seattle Stadium', null),
        (2026083, 83, 'r32', '2e K v 2e L', '2026-07-02 19:00:00+00'::timestamptz, 'Los Angeles Stadium', null),
        (2026084, 84, 'r32', '1er H v 2e J', '2026-07-02 23:00:00+00'::timestamptz, 'Toronto Stadium', null),
        (2026085, 85, 'r32', '1er B v 3e (E/F/G/I/J)', '2026-07-03 03:00:00+00'::timestamptz, 'BC Place Vancouver', null),
        (2026086, 86, 'r32', '1er J v 2e H', '2026-07-03 18:00:00+00'::timestamptz, 'Dallas Stadium', null),
        (2026087, 87, 'r32', '1er K v 3e (D/E/I/J/L)', '2026-07-03 22:00:00+00'::timestamptz, 'Miami Stadium', null),
        (2026088, 88, 'r32', '2e D v 2e G', '2026-07-04 01:30:00+00'::timestamptz, 'Kansas City Stadium', null),
        (2026089, 89, 'r16', 'Vainqueur M74 v Vainqueur M77', '2026-07-04 19:00:00+00'::timestamptz, 'Philadelphia Stadium', 1),
        (2026090, 90, 'r16', 'Vainqueur M73 v Vainqueur M75', '2026-07-04 23:00:00+00'::timestamptz, 'Houston Stadium', 2),
        (2026091, 91, 'r16', 'Vainqueur M76 v Vainqueur M78', '2026-07-06 01:00:00+00'::timestamptz, 'New York New Jersey Stadium', 3),
        (2026092, 92, 'r16', 'Vainqueur M79 v Vainqueur M80', '2026-07-05 22:00:00+00'::timestamptz, 'Mexico City Stadium', 4),
        (2026093, 93, 'r16', 'Vainqueur M83 v Vainqueur M84', '2026-07-06 21:00:00+00'::timestamptz, 'Dallas Stadium', 5),
        (2026094, 94, 'r16', 'Vainqueur M81 v Vainqueur M82', '2026-07-08 01:00:00+00'::timestamptz, 'Seattle Stadium', 6),
        (2026095, 95, 'r16', 'Vainqueur M86 v Vainqueur M88', '2026-07-08 01:00:00+00'::timestamptz, 'Atlanta Stadium', 7),
        (2026096, 96, 'r16', 'Vainqueur M85 v Vainqueur M87', '2026-07-08 01:00:00+00'::timestamptz, 'BC Place Vancouver', 8),
        (2026097, 97, 'qf', 'Vainqueur M89 v Vainqueur M90', '2026-07-09 22:00:00+00'::timestamptz, 'Boston Stadium', 1),
        (2026098, 98, 'qf', 'Vainqueur M93 v Vainqueur M94', '2026-07-10 23:00:00+00'::timestamptz, 'Los Angeles Stadium', 2),
        (2026099, 99, 'qf', 'Vainqueur M91 v Vainqueur M92', '2026-07-11 20:00:00+00'::timestamptz, 'Miami Stadium', 3),
        (2026100, 100, 'qf', 'Vainqueur M95 v Vainqueur M96', '2026-07-12 01:00:00+00'::timestamptz, 'Kansas City Stadium', 4),
        (2026101, 101, 'sf', 'Vainqueur M97 v Vainqueur M98', '2026-07-15 00:00:00+00'::timestamptz, 'Dallas Stadium', 1),
        (2026102, 102, 'sf', 'Vainqueur M99 v Vainqueur M100', '2026-07-16 00:00:00+00'::timestamptz, 'Atlanta Stadium', 2),
        (2026103, 103, 'third_place', 'Perdant M101 v Perdant M102', '2026-07-18 20:00:00+00'::timestamptz, 'Miami Stadium', 1),
        (2026104, 104, 'final', 'Vainqueur M101 v Vainqueur M102', '2026-07-19 20:00:00+00'::timestamptz, 'New York New Jersey Stadium', 1)
    ) as f(
      match_id,
      fifa_no,
      stage_key,
      matchup_label,
      kickoff_at,
      venue,
      bracket_order
    )
  loop
    v_stage := r.stage_key::public.match_stage;

    v_round := case v_stage
      when 'r32' then '32es · M' || r.fifa_no::text || ' — ' || r.matchup_label
      when 'r16' then '16e · M' || r.fifa_no::text || ' — ' || r.matchup_label
      when 'qf' then 'Quart · M' || r.fifa_no::text || ' — ' || r.matchup_label
      when 'sf' then 'Demi · M' || r.fifa_no::text || ' — ' || r.matchup_label
      when 'third_place' then '3e place · M' || r.fifa_no::text
      when 'final' then 'Finale · M' || r.fifa_no::text
      else r.matchup_label
    end;

    insert into public.matches (
      id, round, status, kickoff_at, venue,
      home_team_id, away_team_id,
      odd_home, odd_draw, odd_away,
      stage, bet_scope_note, season
    ) values (
      r.match_id,
      v_round,
      'scheduled',
      r.kickoff_at,
      r.venue,
      9001,
      9002,
      2.50,
      3.20,
      2.80,
      v_stage,
      'Paris sur le résultat à la fin du temps réglementaire uniquement (prolongations et tirs au but exclus).',
      2026
    )
    on conflict (id) do update set
      round = excluded.round,
      status = 'scheduled',
      kickoff_at = excluded.kickoff_at,
      venue = excluded.venue,
      odd_home = excluded.odd_home,
      odd_draw = excluded.odd_draw,
      odd_away = excluded.odd_away,
      stage = excluded.stage,
      bet_scope_note = excluded.bet_scope_note,
      home_score = null,
      away_score = null,
      settled_at = null,
      is_golden = false,
      updated_at = now();

    if r.bracket_order is not null then
      select id into v_slot_id
      from public.bracket_slots
      where stage = v_stage and bracket_order = r.bracket_order
      limit 1;

      if v_slot_id is not null then
        update public.bracket_slots
        set match_id = r.match_id
        where id = v_slot_id;
      end if;
    end if;

    v_count := v_count + 1;
  end loop;

  perform setval(
    'public.manual_match_id_seq',
    greatest((select coalesce(max(id), 2026104) from public.matches), 2026104)
  );

  raise notice 'Phase finale CDM 2026 : % match(s) importés ou mis à jour (M73–M104).', v_count;
end $$;

select stage, count(*) as matchs, min(kickoff_at) as debut, max(kickoff_at) as fin
from public.matches
where id between 2026073 and 2026104
group by stage
order by min(kickoff_at);

select id, round, kickoff_at at time zone 'Europe/Paris' as paris, venue
from public.matches
where id between 2026073 and 2026104
order by kickoff_at
limit 16;
