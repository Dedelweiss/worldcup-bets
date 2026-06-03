-- Corrige le calendrier poule F : le seed initial confondait les positions 2 (Japon) et 3 (Suède).
-- Calendrier FIFA CDM 2026 groupe F :
--   J1 : Pays-Bas–Japon, Suède–Tunisie
--   J2 : Pays-Bas–Suède, Tunisie–Japon
--   J3 : Japon–Suède, Tunisie–Pays-Bas

do $$
declare
  v_nl integer;
  v_jp integer;
  v_se integer;
  v_tn integer;
begin
  select id into v_nl from public.teams where tournament_group_id = 6 and group_position = 1;
  select id into v_jp from public.teams where tournament_group_id = 6 and group_position = 2;
  select id into v_se from public.teams where tournament_group_id = 6 and group_position = 3;
  select id into v_tn from public.teams where tournament_group_id = 6 and group_position = 4;

  if v_nl is null or v_jp is null or v_se is null or v_tn is null then
    raise notice '059: équipes groupe F absentes — exécutez seed_wc2026_groups.sql';
    return;
  end if;

  update public.matches
  set home_team_id = v_nl, away_team_id = v_jp, updated_at = now()
  where id = 2026031;

  update public.matches
  set home_team_id = v_se, away_team_id = v_tn, updated_at = now()
  where id = 2026032;

  update public.matches
  set home_team_id = v_nl, away_team_id = v_se, updated_at = now()
  where id = 2026033;

  update public.matches
  set home_team_id = v_tn, away_team_id = v_jp, updated_at = now()
  where id = 2026034;

  update public.matches
  set home_team_id = v_jp, away_team_id = v_se, updated_at = now()
  where id = 2026035;

  update public.matches
  set home_team_id = v_tn, away_team_id = v_nl, updated_at = now()
  where id = 2026036;
end $$;
