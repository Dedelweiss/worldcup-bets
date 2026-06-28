-- Week-end F1 : sessions, pole, duel coéquipiers, cache championnat.

alter table public.f1_meetings
  add column if not exists sessions jsonb,
  add column if not exists quali_session_key integer,
  add column if not exists quali_start_at timestamptz,
  add column if not exists pole_driver_number integer;

alter type public.f1_bet_type add value if not exists 'pole_position';
alter type public.f1_bet_type add value if not exists 'teammate_duel';

create table if not exists public.f1_championship_cache (
  id integer primary key default 1 check (id = 1),
  season integer not null,
  round integer,
  driver_standings jsonb not null default '[]'::jsonb,
  constructor_standings jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now()
);

alter table public.f1_championship_cache enable row level security;

create policy "f1_championship_cache read authenticated"
  on public.f1_championship_cache for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Pole position (clôture au début des qualifs)
-- ---------------------------------------------------------------------------
create or replace function public.place_f1_pole_bet(
  p_meeting_key integer,
  p_driver_number integer,
  p_odd numeric default 6
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bet_id uuid;
  v_points integer;
  v_meeting public.f1_meetings%rowtype;
  v_existing_id uuid;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_meeting from public.f1_meetings where meeting_key = p_meeting_key;
  if not found then raise exception 'Grand Prix not found'; end if;
  if v_meeting.status <> 'scheduled' then raise exception 'Betting is closed'; end if;

  if v_meeting.quali_start_at is not null and v_meeting.quali_start_at <= now() then
    raise exception 'Qualifying has already started';
  end if;

  if not exists (
    select 1 from public.f1_drivers d
    where d.meeting_key = p_meeting_key and d.driver_number = p_driver_number
  ) then
    raise exception 'Driver not found';
  end if;

  v_points := public.points_from_odd(p_odd);

  select b.id into v_existing_id
  from public.f1_bets b
  where b.user_id = v_user_id and b.meeting_key = p_meeting_key
    and b.bet_type = 'pole_position' and b.status = 'pending'
  limit 1;

  if v_existing_id is not null then
    update public.f1_bets
    set driver_number = p_driver_number, odd_at_placement = p_odd, potential_payout = v_points
    where id = v_existing_id;
    return v_existing_id;
  end if;

  insert into public.f1_bets (
    user_id, meeting_key, bet_type, driver_number,
    odd_at_placement, potential_payout, is_boosted
  )
  values (
    v_user_id, p_meeting_key, 'pole_position', p_driver_number,
    p_odd, v_points, false
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

grant execute on function public.place_f1_pole_bet to authenticated;

-- ---------------------------------------------------------------------------
-- Duel coéquipiers (clôture au départ course)
-- ---------------------------------------------------------------------------
create or replace function public.place_f1_teammate_duel_bet(
  p_meeting_key integer,
  p_driver_number integer,
  p_teammate_number integer,
  p_odd numeric default 1.9
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bet_id uuid;
  v_points integer;
  v_meeting public.f1_meetings%rowtype;
  v_team_a text;
  v_team_b text;
  v_existing_id uuid;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  if p_driver_number = p_teammate_number then
    raise exception 'Pick two different drivers';
  end if;

  select * into v_meeting from public.f1_meetings where meeting_key = p_meeting_key;
  if not found then raise exception 'Grand Prix not found'; end if;
  if v_meeting.status <> 'scheduled' then raise exception 'Betting is closed'; end if;

  if v_meeting.race_start_at is not null and v_meeting.race_start_at <= now() then
    raise exception 'Race has already started';
  end if;

  select d.team_name into v_team_a from public.f1_drivers d
  where d.meeting_key = p_meeting_key and d.driver_number = p_driver_number;
  select d.team_name into v_team_b from public.f1_drivers d
  where d.meeting_key = p_meeting_key and d.driver_number = p_teammate_number;

  if v_team_a is null or v_team_b is null or v_team_a <> v_team_b then
    raise exception 'Drivers must be teammates';
  end if;

  v_points := public.points_from_odd(p_odd);

  select b.id into v_existing_id
  from public.f1_bets b
  where b.user_id = v_user_id and b.meeting_key = p_meeting_key
    and b.bet_type = 'teammate_duel' and b.status = 'pending'
  limit 1;

  if v_existing_id is not null then
    update public.f1_bets
    set
      driver_number = p_driver_number,
      selection = jsonb_build_object(
        'driver_number', p_driver_number,
        'teammate_number', p_teammate_number,
        'team_name', v_team_a
      ),
      odd_at_placement = p_odd,
      potential_payout = v_points
    where id = v_existing_id;
    return v_existing_id;
  end if;

  insert into public.f1_bets (
    user_id, meeting_key, bet_type, driver_number, selection,
    odd_at_placement, potential_payout, is_boosted
  )
  values (
    v_user_id, p_meeting_key, 'teammate_duel', p_driver_number,
    jsonb_build_object(
      'driver_number', p_driver_number,
      'teammate_number', p_teammate_number,
      'team_name', v_team_a
    ),
    p_odd, v_points, false
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

grant execute on function public.place_f1_teammate_duel_bet to authenticated;

-- ---------------------------------------------------------------------------
-- Règlement pole (qualifs)
-- ---------------------------------------------------------------------------
create or replace function public.settle_f1_pole_internal(p_meeting_key integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meeting public.f1_meetings%rowtype;
  v_bet record;
  v_points numeric;
  v_payout numeric;
  v_won int := 0;
  v_lost int := 0;
begin
  select * into v_meeting from public.f1_meetings where meeting_key = p_meeting_key for update;
  if not found or v_meeting.pole_driver_number is null then
    return jsonb_build_object('skipped', true);
  end if;

  for v_bet in
    select * from public.f1_bets
    where meeting_key = p_meeting_key and status = 'pending' and bet_type = 'pole_position'
    for update
  loop
    if v_bet.driver_number = v_meeting.pole_driver_number then
      v_payout := v_bet.potential_payout;
      select points into v_points from public.profiles where id = v_bet.user_id for update;
      update public.profiles set points = points + v_payout where id = v_bet.user_id;
      update public.f1_bets set status = 'won', settled_at = now() where id = v_bet.id;
      insert into public.transactions (user_id, type, amount, balance_after, metadata)
      values (
        v_bet.user_id, 'bet_payout', v_payout, v_points + v_payout,
        jsonb_build_object('sport', 'f1', 'bet_type', 'pole_position', 'meeting_key', p_meeting_key)
      );
      v_won := v_won + 1;
    else
      update public.f1_bets set status = 'lost', settled_at = now() where id = v_bet.id;
      v_lost := v_lost + 1;
    end if;
  end loop;

  return jsonb_build_object('won', v_won, 'lost', v_lost);
end;
$$;

revoke all on function public.settle_f1_pole_internal(integer) from public;
grant execute on function public.settle_f1_pole_internal(integer) to service_role;

-- ---------------------------------------------------------------------------
-- Mise à jour règlement course : ajout teammate_duel
-- ---------------------------------------------------------------------------
create or replace function public.settle_f1_meeting_internal(
  p_meeting_key integer,
  p_winner_driver_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meeting public.f1_meetings%rowtype;
  v_bet record;
  v_points numeric;
  v_payout numeric;
  v_scored integer;
  v_heat_bonus integer;
  v_won int := 0;
  v_lost int := 0;
  v_pick int;
  v_other int;
  v_pick_pos int;
  v_other_pos int;
begin
  select * into v_meeting from public.f1_meetings where meeting_key = p_meeting_key for update;
  if not found then raise exception 'Grand Prix not found'; end if;
  if v_meeting.settled_at is not null then raise exception 'Grand Prix already settled'; end if;

  update public.f1_meetings
  set winner_driver_number = p_winner_driver_number, status = 'finished',
      settled_at = now(), updated_at = now()
  where meeting_key = p_meeting_key;

  for v_bet in
    select * from public.f1_bets
    where meeting_key = p_meeting_key and status = 'pending' and bet_type = 'race_order'
    for update
  loop
    v_scored := public.f1_score_race_order(v_bet.selection, v_meeting.race_results);
    v_payout := v_scored;
    if v_bet.is_boosted then v_payout := v_payout * 2; end if;
    if v_scored > 0 then
      v_heat_bonus := public.on_fire_bonus(v_bet.user_id);
      v_payout := v_payout + v_heat_bonus;
      select points into v_points from public.profiles where id = v_bet.user_id for update;
      update public.profiles set points = points + v_payout where id = v_bet.user_id;
      update public.f1_bets set status = 'won', potential_payout = v_payout::integer, settled_at = now() where id = v_bet.id;
      insert into public.transactions (user_id, type, amount, balance_after, metadata)
      values (v_bet.user_id, 'bet_payout', v_payout, v_points + v_payout,
        jsonb_build_object('sport', 'f1', 'bet_type', 'race_order', 'meeting_key', p_meeting_key, 'scored', v_scored));
      v_won := v_won + 1;
    else
      update public.f1_bets set status = 'lost', potential_payout = 0, settled_at = now() where id = v_bet.id;
      v_lost := v_lost + 1;
    end if;
  end loop;

  for v_bet in
    select * from public.f1_bets
    where meeting_key = p_meeting_key and status = 'pending' and bet_type = 'teammate_duel'
    for update
  loop
    v_pick := (v_bet.selection ->> 'driver_number')::int;
    v_other := (v_bet.selection ->> 'teammate_number')::int;

    select (elem ->> 'position')::int into v_pick_pos
    from jsonb_array_elements(v_meeting.race_results) elem
    where (elem ->> 'driver_number')::int = v_pick limit 1;

    select (elem ->> 'position')::int into v_other_pos
    from jsonb_array_elements(v_meeting.race_results) elem
    where (elem ->> 'driver_number')::int = v_other limit 1;

    if v_pick_pos is not null and v_other_pos is not null and v_pick_pos < v_other_pos then
      v_payout := v_bet.potential_payout;
      select points into v_points from public.profiles where id = v_bet.user_id for update;
      update public.profiles set points = points + v_payout where id = v_bet.user_id;
      update public.f1_bets set status = 'won', settled_at = now() where id = v_bet.id;
      insert into public.transactions (user_id, type, amount, balance_after, metadata)
      values (v_bet.user_id, 'bet_payout', v_payout, v_points + v_payout,
        jsonb_build_object('sport', 'f1', 'bet_type', 'teammate_duel', 'meeting_key', p_meeting_key));
      v_won := v_won + 1;
    else
      update public.f1_bets set status = 'lost', settled_at = now() where id = v_bet.id;
      v_lost := v_lost + 1;
    end if;
  end loop;

  return jsonb_build_object('won', v_won, 'lost', v_lost);
end;
$$;

notify pgrst, 'reload schema';
