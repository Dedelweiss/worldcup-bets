-- Mode F1 : tables dédiées + switch sport sur profils (sans toucher au football).

create type public.active_sport as enum ('football', 'f1');

alter table public.profiles
  add column if not exists active_sport public.active_sport not null default 'football';

alter table public.tournament_config
  add column if not exists f1_mode_enabled boolean not null default true;

-- ---------------------------------------------------------------------------
-- Calendrier F1 (Grand Prix)
-- ---------------------------------------------------------------------------
create table public.f1_meetings (
  meeting_key integer primary key,
  year integer not null,
  meeting_name text not null,
  meeting_official_name text,
  location text,
  country_name text,
  country_code text,
  circuit_key integer,
  circuit_short_name text,
  circuit_image text,
  date_start timestamptz not null,
  date_end timestamptz not null,
  race_session_key integer,
  race_start_at timestamptz,
  status public.match_status not null default 'scheduled',
  winner_driver_number integer,
  settled_at timestamptz,
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index f1_meetings_year_idx on public.f1_meetings (year);
create index f1_meetings_race_start_idx on public.f1_meetings (race_start_at);
create index f1_meetings_status_idx on public.f1_meetings (status);

comment on table public.f1_meetings is 'Grands Prix F1 (cache OpenF1 meetings + session Race)';

-- ---------------------------------------------------------------------------
-- Pilotes par GP (line-up + cotes vainqueur)
-- ---------------------------------------------------------------------------
create table public.f1_drivers (
  id serial primary key,
  meeting_key integer not null references public.f1_meetings (meeting_key) on delete cascade,
  driver_number integer not null,
  full_name text not null,
  name_acronym text,
  team_name text,
  team_colour text,
  headshot_url text,
  winner_odd numeric(6, 2),
  created_at timestamptz not null default now(),
  unique (meeting_key, driver_number)
);

create index f1_drivers_meeting_idx on public.f1_drivers (meeting_key);

-- ---------------------------------------------------------------------------
-- Paris F1
-- ---------------------------------------------------------------------------
create type public.f1_bet_type as enum ('race_winner');

create type public.f1_bet_status as enum (
  'pending',
  'won',
  'lost',
  'void',
  'cancelled'
);

create table public.f1_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  meeting_key integer not null references public.f1_meetings (meeting_key) on delete cascade,
  bet_type public.f1_bet_type not null default 'race_winner',
  driver_number integer not null,
  odd_at_placement numeric(6, 2) not null,
  potential_payout integer not null,
  status public.f1_bet_status not null default 'pending',
  is_boosted boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, meeting_key, bet_type)
);

create index f1_bets_user_idx on public.f1_bets (user_id);
create index f1_bets_meeting_idx on public.f1_bets (meeting_key);
create index f1_bets_status_idx on public.f1_bets (status);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.f1_meetings enable row level security;
alter table public.f1_drivers enable row level security;
alter table public.f1_bets enable row level security;

create policy "f1_meetings read authenticated"
  on public.f1_meetings for select to authenticated using (true);

create policy "f1_drivers read authenticated"
  on public.f1_drivers for select to authenticated using (true);

create policy "f1_bets read own"
  on public.f1_bets for select to authenticated
  using (auth.uid() = user_id);

create policy "f1_bets read admin"
  on public.f1_bets for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Pas d'insert direct : RPC place_f1_race_winner_bet
revoke insert, update, delete on public.f1_bets from authenticated;

-- ---------------------------------------------------------------------------
-- Paris vainqueur GP
-- ---------------------------------------------------------------------------
create or replace function public.place_f1_race_winner_bet(
  p_meeting_key integer,
  p_driver_number integer,
  p_odd numeric,
  p_use_boost boolean default false
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
  v_boosts int;
  v_meeting public.f1_meetings%rowtype;
  v_expected_odd numeric;
  v_existing_id uuid;
  v_was_boosted boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_meeting from public.f1_meetings where meeting_key = p_meeting_key;
  if not found then
    raise exception 'Grand Prix not found';
  end if;

  if v_meeting.is_cancelled then
    raise exception 'Grand Prix cancelled';
  end if;

  if v_meeting.status <> 'scheduled' then
    raise exception 'Betting is closed for this Grand Prix';
  end if;

  if v_meeting.race_start_at is not null and v_meeting.race_start_at <= now() then
    raise exception 'Race has already started';
  end if;

  select d.winner_odd into v_expected_odd
  from public.f1_drivers d
  where d.meeting_key = p_meeting_key and d.driver_number = p_driver_number;

  if v_expected_odd is null then
    raise exception 'Driver not found for this Grand Prix';
  end if;

  if abs(p_odd - v_expected_odd) > 0.01 then
    raise exception 'Odds have changed, please refresh';
  end if;

  v_points := public.points_from_odd(p_odd);

  select b.id, b.is_boosted
  into v_existing_id, v_was_boosted
  from public.f1_bets b
  where b.user_id = v_user_id
    and b.meeting_key = p_meeting_key
    and b.bet_type = 'race_winner'
    and b.status = 'pending'
  limit 1;

  if v_existing_id is not null then
    if coalesce(p_use_boost, false) and not coalesce(v_was_boosted, false) then
      select boosts_available into v_boosts from public.profiles where id = v_user_id for update;
      if v_boosts < 1 then raise exception 'No boost available'; end if;
      update public.profiles set boosts_available = boosts_available - 1 where id = v_user_id;
    elsif not coalesce(p_use_boost, false) and coalesce(v_was_boosted, false) then
      update public.profiles set boosts_available = boosts_available + 1 where id = v_user_id;
    end if;

    update public.f1_bets
    set
      driver_number = p_driver_number,
      odd_at_placement = p_odd,
      potential_payout = v_points,
      is_boosted = coalesce(p_use_boost, false)
    where id = v_existing_id;

    return v_existing_id;
  end if;

  if p_use_boost then
    select boosts_available into v_boosts from public.profiles where id = v_user_id for update;
    if v_boosts < 1 then raise exception 'No boost available'; end if;
    update public.profiles set boosts_available = boosts_available - 1 where id = v_user_id;
  end if;

  insert into public.f1_bets (
    user_id, meeting_key, bet_type, driver_number,
    odd_at_placement, potential_payout, is_boosted
  )
  values (
    v_user_id, p_meeting_key, 'race_winner', p_driver_number,
    p_odd, v_points, coalesce(p_use_boost, false)
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

grant execute on function public.place_f1_race_winner_bet to authenticated;

-- ---------------------------------------------------------------------------
-- Règlement auto / admin d'un GP
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
  v_heat_bonus integer;
  v_won int := 0;
  v_lost int := 0;
begin
  select * into v_meeting from public.f1_meetings where meeting_key = p_meeting_key for update;
  if not found then
    raise exception 'Grand Prix not found';
  end if;

  if v_meeting.settled_at is not null then
    raise exception 'Grand Prix already settled';
  end if;

  update public.f1_meetings
  set
    winner_driver_number = p_winner_driver_number,
    status = 'finished',
    settled_at = now(),
    updated_at = now()
  where meeting_key = p_meeting_key;

  for v_bet in
    select * from public.f1_bets
    where meeting_key = p_meeting_key and status = 'pending' and bet_type = 'race_winner'
    for update
  loop
    if v_bet.driver_number = p_winner_driver_number then
      v_payout := v_bet.potential_payout;
      if v_bet.is_boosted then
        v_payout := v_bet.potential_payout * 2;
      end if;
      v_heat_bonus := public.on_fire_bonus(v_bet.user_id);
      v_payout := v_payout + v_heat_bonus;

      select points into v_points from public.profiles where id = v_bet.user_id for update;

      update public.profiles set points = points + v_payout where id = v_bet.user_id;

      update public.f1_bets
      set status = 'won', settled_at = now()
      where id = v_bet.id;

      insert into public.transactions (user_id, type, amount, balance_after, bet_id, metadata)
      values (
        v_bet.user_id,
        'bet_payout',
        v_payout,
        v_points + v_payout,
        null,
        jsonb_build_object(
          'unit', 'points',
          'sport', 'f1',
          'f1_bet_id', v_bet.id,
          'meeting_key', p_meeting_key,
          'boosted', v_bet.is_boosted,
          'on_fire_bonus', v_heat_bonus
        )
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

create or replace function public.settle_f1_meeting(
  p_meeting_key integer,
  p_winner_driver_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'Admin only';
  end if;

  return public.settle_f1_meeting_internal(p_meeting_key, p_winner_driver_number);
end;
$$;

create or replace function public.auto_settle_f1_meeting(p_meeting_key integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meeting public.f1_meetings%rowtype;
  v_winner int;
begin
  select * into v_meeting from public.f1_meetings where meeting_key = p_meeting_key;
  if not found or v_meeting.settled_at is not null then
    return jsonb_build_object('skipped', true);
  end if;

  v_winner := v_meeting.winner_driver_number;
  if v_winner is null then
    return jsonb_build_object('skipped', true, 'reason', 'no_winner');
  end if;

  return public.settle_f1_meeting_internal(p_meeting_key, v_winner);
end;
$$;

grant execute on function public.settle_f1_meeting to authenticated;
revoke all on function public.settle_f1_meeting_internal(integer, integer) from public;
grant execute on function public.settle_f1_meeting_internal(integer, integer) to service_role;
revoke all on function public.auto_settle_f1_meeting(integer) from public;
grant execute on function public.auto_settle_f1_meeting(integer) to service_role;

-- Mise à jour sport actif (profil)
create or replace function public.set_active_sport(p_sport public.active_sport)
returns public.active_sport
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_enabled boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_sport = 'f1' then
    select f1_mode_enabled into v_enabled from public.tournament_config where id = 1;
    if not coalesce(v_enabled, true) then
      raise exception 'F1 mode is disabled';
    end if;
  end if;

  update public.profiles set active_sport = p_sport where id = v_user_id;
  return p_sport;
end;
$$;

grant execute on function public.set_active_sport to authenticated;

notify pgrst, 'reload schema';
