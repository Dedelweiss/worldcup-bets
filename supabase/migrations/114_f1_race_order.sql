-- Pari top 10 ordonné (race_order) + résultats course pour scoring.

alter type public.f1_bet_type add value if not exists 'race_order';

alter table public.f1_meetings
  add column if not exists race_results jsonb;

comment on column public.f1_meetings.race_results is
  'Classement final [{driver_number, position}] depuis OpenF1 session_result';

alter table public.f1_bets
  add column if not exists selection jsonb;

alter table public.f1_bets
  alter column driver_number drop not null;

-- ---------------------------------------------------------------------------
-- Barème ±3 places (0 → 10 pts, 1 → 6, 2 → 3, 3 → 1)
-- ---------------------------------------------------------------------------
create or replace function public.f1_race_order_delta_points(p_delta integer)
returns integer
language sql
immutable
as $$
  select case
    when p_delta = 0 then 10
    when p_delta = 1 then 6
    when p_delta = 2 then 3
    when p_delta = 3 then 1
    else 0
  end;
$$;

create or replace function public.f1_score_race_order(
  p_order jsonb,
  p_race_results jsonb
)
returns integer
language plpgsql
immutable
as $$
declare
  v_i integer;
  v_driver integer;
  v_predicted integer;
  v_actual integer;
  v_delta integer;
  v_total integer := 0;
begin
  if p_order is null or jsonb_typeof(p_order) <> 'array' then
    return 0;
  end if;

  if jsonb_array_length(p_order) <> 10 then
    return 0;
  end if;

  if p_race_results is null or jsonb_typeof(p_race_results) <> 'array' then
    return 0;
  end if;

  for v_i in 0..9 loop
    v_driver := (p_order ->> v_i)::integer;
    v_predicted := v_i + 1;

    select (elem ->> 'position')::integer
    into v_actual
    from jsonb_array_elements(p_race_results) as elem
    where (elem ->> 'driver_number')::integer = v_driver
    limit 1;

    if v_actual is null then
      v_actual := 99;
    end if;

    v_delta := abs(v_predicted - v_actual);
    v_total := v_total + public.f1_race_order_delta_points(v_delta);
  end loop;

  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- Paris top 10 ordonné
-- ---------------------------------------------------------------------------
create or replace function public.place_f1_race_order_bet(
  p_meeting_key integer,
  p_order jsonb,
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
  v_boosts int;
  v_meeting public.f1_meetings%rowtype;
  v_existing_id uuid;
  v_was_boosted boolean;
  v_driver integer;
  v_i integer;
  v_seen integer[];
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_order is null or jsonb_typeof(p_order) <> 'array' or jsonb_array_length(p_order) <> 10 then
    raise exception 'Order must contain exactly 10 drivers';
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

  v_seen := array[]::integer[];

  for v_i in 0..9 loop
    v_driver := (p_order ->> v_i)::integer;
    if v_driver is null or v_driver < 1 or v_driver > 99 then
      raise exception 'Invalid driver number in order';
    end if;
    if v_driver = any(v_seen) then
      raise exception 'Duplicate driver in order';
    end if;
    v_seen := array_append(v_seen, v_driver);

    if not exists (
      select 1 from public.f1_drivers d
      where d.meeting_key = p_meeting_key and d.driver_number = v_driver
    ) then
      raise exception 'Driver % not in this Grand Prix', v_driver;
    end if;
  end loop;

  select b.id, b.is_boosted
  into v_existing_id, v_was_boosted
  from public.f1_bets b
  where b.user_id = v_user_id
    and b.meeting_key = p_meeting_key
    and b.bet_type = 'race_order'
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
      selection = p_order,
      potential_payout = 100,
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
    selection, odd_at_placement, potential_payout, is_boosted
  )
  values (
    v_user_id, p_meeting_key, 'race_order', null,
    p_order, 1, 100, coalesce(p_use_boost, false)
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

grant execute on function public.place_f1_race_order_bet to authenticated;

-- ---------------------------------------------------------------------------
-- Règlement : vainqueur + top 10 ordonné
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

  -- Paris vainqueur
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
      set status = 'won', potential_payout = v_payout::integer, settled_at = now()
      where id = v_bet.id;

      insert into public.transactions (user_id, type, amount, balance_after, bet_id, metadata)
      values (
        v_bet.user_id, 'bet_payout', v_payout, v_points + v_payout, null,
        jsonb_build_object(
          'unit', 'points', 'sport', 'f1', 'f1_bet_id', v_bet.id,
          'bet_type', 'race_winner', 'meeting_key', p_meeting_key,
          'boosted', v_bet.is_boosted, 'on_fire_bonus', v_heat_bonus
        )
      );
      v_won := v_won + 1;
    else
      update public.f1_bets set status = 'lost', settled_at = now() where id = v_bet.id;
      v_lost := v_lost + 1;
    end if;
  end loop;

  -- Paris top 10 ordonné
  for v_bet in
    select * from public.f1_bets
    where meeting_key = p_meeting_key and status = 'pending' and bet_type = 'race_order'
    for update
  loop
    v_scored := public.f1_score_race_order(v_bet.selection, v_meeting.race_results);
    v_payout := v_scored;

    if v_bet.is_boosted then
      v_payout := v_payout * 2;
    end if;

    if v_scored > 0 then
      v_heat_bonus := public.on_fire_bonus(v_bet.user_id);
      v_payout := v_payout + v_heat_bonus;

      select points into v_points from public.profiles where id = v_bet.user_id for update;
      update public.profiles set points = points + v_payout where id = v_bet.user_id;

      update public.f1_bets
      set
        status = 'won',
        potential_payout = v_payout::integer,
        settled_at = now()
      where id = v_bet.id;

      insert into public.transactions (user_id, type, amount, balance_after, bet_id, metadata)
      values (
        v_bet.user_id, 'bet_payout', v_payout, v_points + v_payout, null,
        jsonb_build_object(
          'unit', 'points', 'sport', 'f1', 'f1_bet_id', v_bet.id,
          'bet_type', 'race_order', 'meeting_key', p_meeting_key,
          'scored', v_scored, 'boosted', v_bet.is_boosted, 'on_fire_bonus', v_heat_bonus
        )
      );
      v_won := v_won + 1;
    else
      update public.f1_bets
      set status = 'lost', potential_payout = 0, settled_at = now()
      where id = v_bet.id;
      v_lost := v_lost + 1;
    end if;
  end loop;

  return jsonb_build_object('won', v_won, 'lost', v_lost);
end;
$$;

notify pgrst, 'reload schema';
