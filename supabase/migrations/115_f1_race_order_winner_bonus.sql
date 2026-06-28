-- Bonus vainqueur P1 exact en tête du top 10 (+15 pts en plus des 10 position).

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
  v_winner integer;
  v_predicted_p1 integer;
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

  -- Bonus : vainqueur prédit en P1
  select (elem ->> 'driver_number')::integer
  into v_winner
  from jsonb_array_elements(p_race_results) as elem
  where (elem ->> 'position')::integer = 1
  limit 1;

  v_predicted_p1 := (p_order ->> 0)::integer;

  if v_winner is not null and v_predicted_p1 = v_winner then
    v_total := v_total + 15;
  end if;

  return v_total;
end;
$$;

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
      potential_payout = 115,
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
    p_order, 1, 115, coalesce(p_use_boost, false)
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

notify pgrst, 'reload schema';
