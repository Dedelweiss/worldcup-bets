-- Groupes de poule CDM 2026 (A–L), stages, bracket, création de matchs par équipes

-- -----------------------------------------------------------------------------
-- ENUM stage (≠ table public.groups = ligues privées)
-- -----------------------------------------------------------------------------
create type public.match_stage as enum (
  'group',
  'r32',
  'r16',
  'qf',
  'sf',
  'third_place',
  'final'
);

-- -----------------------------------------------------------------------------
-- Groupes de poule (12 × 4 équipes)
-- -----------------------------------------------------------------------------
create table public.tournament_groups (
  id smallint primary key,
  letter char(1) not null unique check (letter ~ '^[A-L]$'),
  name text not null
);

insert into public.tournament_groups (id, letter, name) values
  (1, 'A', 'Groupe A'),
  (2, 'B', 'Groupe B'),
  (3, 'C', 'Groupe C'),
  (4, 'D', 'Groupe D'),
  (5, 'E', 'Groupe E'),
  (6, 'F', 'Groupe F'),
  (7, 'G', 'Groupe G'),
  (8, 'H', 'Groupe H'),
  (9, 'I', 'Groupe I'),
  (10, 'J', 'Groupe J'),
  (11, 'K', 'Groupe K'),
  (12, 'L', 'Groupe L');

-- -----------------------------------------------------------------------------
-- Équipes : rattachement au groupe de poule
-- -----------------------------------------------------------------------------
alter table public.teams
  add column if not exists tournament_group_id smallint references public.tournament_groups (id) on delete set null,
  add column if not exists group_position smallint check (group_position between 1 and 4);

create unique index teams_group_position_uidx
  on public.teams (tournament_group_id, group_position)
  where tournament_group_id is not null and group_position is not null;

create index teams_tournament_group_idx on public.teams (tournament_group_id);

-- -----------------------------------------------------------------------------
-- Matchs : phase + groupe optionnel + note paris phase finale
-- -----------------------------------------------------------------------------
alter table public.matches
  add column if not exists stage public.match_stage not null default 'group',
  add column if not exists tournament_group_id smallint references public.tournament_groups (id) on delete set null,
  add column if not exists bet_scope_note text;

create index matches_stage_idx on public.matches (stage);
create index matches_tournament_group_idx on public.matches (tournament_group_id);

comment on column public.matches.bet_scope_note is
  'Ex: Paris 1N2 sur le temps réglementaire uniquement (phase finale)';

-- -----------------------------------------------------------------------------
-- Arbre éliminatoire (rempli manuellement par l''admin)
-- -----------------------------------------------------------------------------
create table public.bracket_slots (
  id uuid primary key default gen_random_uuid(),
  stage public.match_stage not null,
  label text not null,
  match_id integer unique references public.matches (id) on delete set null,
  bracket_order smallint not null default 0,
  parent_slot_id uuid references public.bracket_slots (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint bracket_slots_knockout_only check (stage <> 'group')
);

create index bracket_slots_stage_order_idx on public.bracket_slots (stage, bracket_order);

-- Slots par défaut (structure flexible, match_id NULL jusqu''à création admin)
insert into public.bracket_slots (stage, label, bracket_order) values
  ('r16', '16e de finale · Match 1', 1),
  ('r16', '16e de finale · Match 2', 2),
  ('r16', '16e de finale · Match 3', 3),
  ('r16', '16e de finale · Match 4', 4),
  ('r16', '16e de finale · Match 5', 5),
  ('r16', '16e de finale · Match 6', 6),
  ('r16', '16e de finale · Match 7', 7),
  ('r16', '16e de finale · Match 8', 8),
  ('qf', 'Quart de finale · Match 1', 1),
  ('qf', 'Quart de finale · Match 2', 2),
  ('qf', 'Quart de finale · Match 3', 3),
  ('qf', 'Quart de finale · Match 4', 4),
  ('sf', 'Demi-finale · Match 1', 1),
  ('sf', 'Demi-finale · Match 2', 2),
  ('third_place', 'Match pour la 3e place', 1),
  ('final', 'Finale', 1);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.tournament_groups enable row level security;
alter table public.bracket_slots enable row level security;

create policy "Tournament groups readable"
  on public.tournament_groups for select to authenticated using (true);

create policy "Bracket slots readable"
  on public.bracket_slots for select to authenticated using (true);

create policy "Admins manage bracket slots"
  on public.bracket_slots for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Helper : URL drapeau flagcdn
-- -----------------------------------------------------------------------------
create or replace function public.team_flag_url(p_code text)
returns text
language sql
immutable
as $$
  select case
    when p_code is null or trim(p_code) = '' then null
    else 'https://flagcdn.com/w80/' || lower(trim(p_code)) || '.png'
  end;
$$;

-- -----------------------------------------------------------------------------
-- RPC : enregistrer / mettre à jour une équipe dans un groupe (max 4)
-- -----------------------------------------------------------------------------
create or replace function public.admin_upsert_tournament_team(
  p_tournament_group_id smallint,
  p_group_position smallint,
  p_name text,
  p_country_code text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id integer;
  v_code text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_group_position < 1 or p_group_position > 4 then
    raise exception 'Position must be between 1 and 4';
  end if;

  if not exists (select 1 from public.tournament_groups where id = p_tournament_group_id) then
    raise exception 'Invalid tournament group';
  end if;

  v_code := upper(trim(p_country_code));

  select id into v_team_id
  from public.teams
  where tournament_group_id = p_tournament_group_id
    and group_position = p_group_position;

  if v_team_id is not null then
    update public.teams
    set
      name = trim(p_name),
      code = v_code,
      logo_url = public.team_flag_url(v_code),
      tournament_group_id = p_tournament_group_id,
      group_position = p_group_position,
      updated_at = now()
    where id = v_team_id;
  else
    v_team_id := nextval('public.manual_team_id_seq');
    insert into public.teams (
      id, name, code, logo_url, tournament_group_id, group_position
    ) values (
      v_team_id,
      trim(p_name),
      v_code,
      public.team_flag_url(v_code),
      p_tournament_group_id,
      p_group_position
    );
  end if;

  return v_team_id;
end;
$$;

grant execute on function public.admin_upsert_tournament_team to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : match de poule (2 équipes du même groupe)
-- -----------------------------------------------------------------------------
create or replace function public.admin_create_group_match(
  p_tournament_group_id smallint,
  p_home_team_id integer,
  p_away_team_id integer,
  p_kickoff_at timestamptz,
  p_odd_home numeric,
  p_odd_draw numeric,
  p_odd_away numeric,
  p_matchday smallint default 1,
  p_venue text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id integer;
  v_letter char(1);
  v_round text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_home_team_id = p_away_team_id then
    raise exception 'Home and away must differ';
  end if;

  if p_odd_home < 1.01 or p_odd_draw < 1.01 or p_odd_away < 1.01 then
    raise exception 'Odds must be >= 1.01';
  end if;

  select letter into v_letter from public.tournament_groups where id = p_tournament_group_id;
  if v_letter is null then
    raise exception 'Invalid tournament group';
  end if;

  if not exists (
    select 1 from public.teams
    where id = p_home_team_id and tournament_group_id = p_tournament_group_id
  ) or not exists (
    select 1 from public.teams
    where id = p_away_team_id and tournament_group_id = p_tournament_group_id
  ) then
    raise exception 'Both teams must belong to the selected group';
  end if;

  v_round := 'Groupe ' || v_letter || ' · J' || coalesce(p_matchday::text, '1');

  v_match_id := nextval('public.manual_match_id_seq');
  insert into public.matches (
    id, round, status, kickoff_at, venue,
    home_team_id, away_team_id,
    odd_home, odd_draw, odd_away,
    stage, tournament_group_id, created_by
  ) values (
    v_match_id, v_round, 'scheduled', p_kickoff_at, p_venue,
    p_home_team_id, p_away_team_id,
    p_odd_home, p_odd_draw, p_odd_away,
    'group', p_tournament_group_id, auth.uid()
  );

  return v_match_id;
end;
$$;

grant execute on function public.admin_create_group_match to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : match phase finale (équipes libres + slot bracket optionnel)
-- -----------------------------------------------------------------------------
create or replace function public.admin_create_knockout_match(
  p_stage public.match_stage,
  p_home_team_id integer,
  p_away_team_id integer,
  p_kickoff_at timestamptz,
  p_odd_home numeric,
  p_odd_draw numeric,
  p_odd_away numeric,
  p_bracket_slot_id uuid default null,
  p_venue text default null,
  p_bet_scope_note text default 'Paris 1N2 sur le temps réglementaire uniquement.'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id integer;
  v_round text;
  v_slot_label text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_stage = 'group' then
    raise exception 'Use admin_create_group_match for group stage';
  end if;

  if p_home_team_id = p_away_team_id then
    raise exception 'Home and away must differ';
  end if;

  if p_odd_home < 1.01 or p_odd_draw < 1.01 or p_odd_away < 1.01 then
    raise exception 'Odds must be >= 1.01';
  end if;

  if not exists (select 1 from public.teams where id = p_home_team_id)
     or not exists (select 1 from public.teams where id = p_away_team_id) then
    raise exception 'Invalid team id';
  end if;

  if p_bracket_slot_id is not null then
    select label into v_slot_label
    from public.bracket_slots
    where id = p_bracket_slot_id and stage = p_stage;

    if v_slot_label is null then
      raise exception 'Invalid bracket slot for this stage';
    end if;
    v_round := v_slot_label;
  else
    v_round := case p_stage
      when 'r32' then '32es de finale'
      when 'r16' then '16e de finale'
      when 'qf' then 'Quart de finale'
      when 'sf' then 'Demi-finale'
      when 'third_place' then 'Match pour la 3e place'
      when 'final' then 'Finale'
      else p_stage::text
    end;
  end if;

  v_match_id := nextval('public.manual_match_id_seq');
  insert into public.matches (
    id, round, status, kickoff_at, venue,
    home_team_id, away_team_id,
    odd_home, odd_draw, odd_away,
    stage, bet_scope_note, created_by
  ) values (
    v_match_id, v_round, 'scheduled', p_kickoff_at, p_venue,
    p_home_team_id, p_away_team_id,
    p_odd_home, p_odd_draw, p_odd_away,
    p_stage, p_bet_scope_note, auth.uid()
  );

  if p_bracket_slot_id is not null then
    update public.bracket_slots
    set match_id = v_match_id
    where id = p_bracket_slot_id;
  end if;

  return v_match_id;
end;
$$;

grant execute on function public.admin_create_knockout_match to authenticated;

notify pgrst, 'reload schema';
