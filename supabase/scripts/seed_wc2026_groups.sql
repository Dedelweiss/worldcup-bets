-- =============================================================================
-- WC2026 Pool — Poules officielles CDM 2026 (48 équipes, groupes A–L)
-- =============================================================================
-- PRÉREQUIS : migration 011_tournament_groups_stages.sql exécutée.
--
-- Source : tirage final FIFA (décembre 2025), barrages UEFA / intercontinentaux
-- résolus (Tchéquie, Bosnie-Herzégovine, Turquie, Suède, Irak, RD Congo).
--
-- Usage : Supabase → SQL Editor → coller ce fichier → Run.
-- Idempotent : ré-exécutable (met à jour nom, code, drapeau par slot de poule).
--
-- Ensuite : seed_wc2026_group_matches.sql (poules), puis seed_wc2026_knockout_matches.sql (finale).
--
-- ⚠️  Les matchs déjà créés qui référencent des équipes de poule ne sont PAS
--     supprimés. Pour repartir de zéro, décommentez la section « reset » ci-dessous.

-- -----------------------------------------------------------------------------
-- Reset optionnel (décommenter si besoin)
-- -----------------------------------------------------------------------------
-- delete from public.matches where stage = 'group';
-- update public.teams
-- set tournament_group_id = null, group_position = null
-- where tournament_group_id is not null;

-- -----------------------------------------------------------------------------
-- Import des 48 équipes (tournament_group_id 1–12 = A–L, positions 1–4)
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
  v_team_id integer;
  v_code text;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tournament_groups'
  ) then
    raise exception 'Table tournament_groups absente — exécutez 011_tournament_groups_stages.sql';
  end if;

  for r in
    select *
    from (
      values
        -- Groupe A (Mexique)
        (1::smallint, 1::smallint, 'Mexique', 'MX'),
        (1, 2, 'Afrique du Sud', 'ZA'),
        (1, 3, 'Corée du Sud', 'KR'),
        (1, 4, 'Tchéquie', 'CZ'),
        -- Groupe B (Canada)
        (2, 1, 'Canada', 'CA'),
        (2, 2, 'Bosnie-Herzégovine', 'BA'),
        (2, 3, 'Qatar', 'QA'),
        (2, 4, 'Suisse', 'CH'),
        -- Groupe C (Brésil)
        (3, 1, 'Brésil', 'BR'),
        (3, 2, 'Maroc', 'MA'),
        (3, 3, 'Haïti', 'HT'),
        (3, 4, 'Écosse', 'GB-SCT'),
        -- Groupe D (États-Unis)
        (4, 1, 'États-Unis', 'US'),
        (4, 2, 'Paraguay', 'PY'),
        (4, 3, 'Australie', 'AU'),
        (4, 4, 'Turquie', 'TR'),
        -- Groupe E (Allemagne)
        (5, 1, 'Allemagne', 'DE'),
        (5, 2, 'Curaçao', 'CW'),
        (5, 3, 'Côte d''Ivoire', 'CI'),
        (5, 4, 'Équateur', 'EC'),
        -- Groupe F (Pays-Bas)
        (6, 1, 'Pays-Bas', 'NL'),
        (6, 2, 'Japon', 'JP'),
        (6, 3, 'Suède', 'SE'),
        (6, 4, 'Tunisie', 'TN'),
        -- Groupe G (Belgique)
        (7, 1, 'Belgique', 'BE'),
        (7, 2, 'Égypte', 'EG'),
        (7, 3, 'Iran', 'IR'),
        (7, 4, 'Nouvelle-Zélande', 'NZ'),
        -- Groupe H (Espagne)
        (8, 1, 'Espagne', 'ES'),
        (8, 2, 'Cap-Vert', 'CV'),
        (8, 3, 'Arabie saoudite', 'SA'),
        (8, 4, 'Uruguay', 'UY'),
        -- Groupe I (France)
        (9, 1, 'France', 'FR'),
        (9, 2, 'Sénégal', 'SN'),
        (9, 3, 'Norvège', 'NO'),
        (9, 4, 'Irak', 'IQ'),
        -- Groupe J (Argentine)
        (10, 1, 'Argentine', 'AR'),
        (10, 2, 'Algérie', 'DZ'),
        (10, 3, 'Autriche', 'AT'),
        (10, 4, 'Jordanie', 'JO'),
        -- Groupe K (Portugal)
        (11, 1, 'Portugal', 'PT'),
        (11, 2, 'RD Congo', 'CD'),
        (11, 3, 'Ouzbékistan', 'UZ'),
        (11, 4, 'Colombie', 'CO'),
        -- Groupe L (Angleterre)
        (12, 1, 'Angleterre', 'GB-ENG'),
        (12, 2, 'Croatie', 'HR'),
        (12, 3, 'Ghana', 'GH'),
        (12, 4, 'Panama', 'PA')
    ) as v(tournament_group_id, group_position, team_name, country_code)
  loop
    v_code := upper(trim(r.country_code));

    select id into v_team_id
    from public.teams
    where tournament_group_id = r.tournament_group_id
      and group_position = r.group_position;

    if v_team_id is not null then
      update public.teams
      set
        name = r.team_name,
        code = v_code,
        logo_url = public.team_flag_url(v_code),
        tournament_group_id = r.tournament_group_id,
        group_position = r.group_position,
        updated_at = now()
      where id = v_team_id;
    else
      v_team_id := nextval('public.manual_team_id_seq');
      insert into public.teams (
        id, name, code, logo_url, tournament_group_id, group_position
      ) values (
        v_team_id,
        r.team_name,
        v_code,
        public.team_flag_url(v_code),
        r.tournament_group_id,
        r.group_position
      );
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Vérification rapide
-- -----------------------------------------------------------------------------
select
  tg.letter,
  tg.name as groupe,
  t.group_position as pos,
  t.name as equipe,
  t.code
from public.tournament_groups tg
left join public.teams t on t.tournament_group_id = tg.id
order by tg.id, t.group_position;
