-- Tacle Glissé (PvP) + Gazette du Match (résumé IA)

-- -----------------------------------------------------------------------------
-- Types & colonnes
-- -----------------------------------------------------------------------------
create type public.tackle_phase as enum ('group', 'knockout');

alter type public.transaction_type add value if not exists 'tackle_bonus';
alter type public.transaction_type add value if not exists 'tackle_penalty';

alter table public.matches
  add column if not exists ai_summary text;

comment on column public.matches.ai_summary is
  'Résumé IA « Gazette du Match », généré une fois avant le coup d''envoi.';

-- Permettre les pénalités de tacle (points négatifs)
alter table public.profiles drop constraint if exists profiles_balance_check;

-- -----------------------------------------------------------------------------
-- Table tackles
-- -----------------------------------------------------------------------------
create table public.tackles (
  id uuid primary key default gen_random_uuid(),
  match_id integer not null references public.matches (id) on delete cascade,
  attacker_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  phase public.tackle_phase not null,
  is_resolved boolean not null default false,
  attacker_won boolean,
  attacker_delta integer not null default 0,
  target_delta integer not null default 0,
  created_at timestamptz not null default now(),
  constraint tackles_distinct_users check (attacker_id <> target_id)
);

create unique index tackles_one_per_attacker_phase
  on public.tackles (attacker_id, phase);

create index tackles_match_id_idx on public.tackles (match_id);
create index tackles_unresolved_match_idx
  on public.tackles (match_id)
  where not is_resolved;

alter table public.tackles enable row level security;

create policy tackles_select_authenticated
  on public.tackles for select to authenticated using (true);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.tackle_phase_for_stage(p_stage public.match_stage)
returns public.tackle_phase
language sql
immutable
set search_path = public
as $$
  select case
    when p_stage is null or p_stage = 'group' then 'group'::public.tackle_phase
    else 'knockout'::public.tackle_phase
  end;
$$;

create or replace function public.match_classic_points_earned(
  p_user_id uuid,
  p_match_id integer
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(t.amount), 0)
  from public.transactions t
  join public.bets b on b.id = t.bet_id
  where b.match_id = p_match_id
    and b.user_id = p_user_id
    and b.bet_type in ('match_result', 'exact_score')
    and t.type = 'bet_payout';
$$;

create or replace function public.apply_tackle_points(
  p_user_id uuid,
  p_delta integer,
  p_tackle_id uuid,
  p_match_id integer,
  p_tx_type public.transaction_type
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points numeric;
  v_new_points numeric;
begin
  if p_delta = 0 then
    return;
  end if;

  select points into v_points
  from public.profiles
  where id = p_user_id
  for update;

  v_new_points := v_points + p_delta;

  update public.profiles
  set points = v_new_points
  where id = p_user_id;

  insert into public.transactions (user_id, type, amount, balance_after, metadata)
  values (
    p_user_id,
    p_tx_type,
    p_delta,
    v_new_points,
    jsonb_build_object(
      'unit', 'points',
      'tackle_id', p_tackle_id,
      'match_id', p_match_id
    )
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- place_tackle : 1 tacle par phase, avant coup d'envoi
-- -----------------------------------------------------------------------------
create or replace function public.place_tackle(
  p_match_id integer,
  p_target_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_phase public.tackle_phase;
  v_tackle_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_id = v_user_id then
    raise exception 'Cannot tackle yourself';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id;

  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.status <> 'scheduled' then
    raise exception 'Tackle only allowed before match starts';
  end if;

  if v_match.kickoff_at <= now() then
    raise exception 'Tackle closed: kickoff has passed';
  end if;

  v_phase := public.tackle_phase_for_stage(v_match.stage);

  if exists (
    select 1 from public.tackles t
    where t.attacker_id = v_user_id and t.phase = v_phase
  ) then
    raise exception 'Tackle already used for this phase';
  end if;

  if not exists (
    select 1 from public.bets b
    where b.match_id = p_match_id
      and b.user_id = v_user_id
      and b.status = 'pending'
      and b.bet_type in ('match_result', 'exact_score')
  ) then
    raise exception 'You must have a classic bet on this match to tackle';
  end if;

  if not exists (
    select 1 from public.bets b
    where b.match_id = p_match_id
      and b.user_id = p_target_id
      and b.status = 'pending'
      and b.bet_type in ('match_result', 'exact_score')
  ) then
    raise exception 'Target has no classic bet on this match';
  end if;

  insert into public.tackles (
    match_id,
    attacker_id,
    target_id,
    phase
  )
  values (
    p_match_id,
    v_user_id,
    p_target_id,
    v_phase
  )
  returning id into v_tackle_id;

  return v_tackle_id;
end;
$$;

grant execute on function public.place_tackle(integer, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- resolve_tackles_for_match : après clôture des paris classiques
-- -----------------------------------------------------------------------------
create or replace function public.resolve_tackles_for_match(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tackle record;
  v_attacker_pts numeric;
  v_target_pts numeric;
  v_resolved int := 0;
  v_success int := 0;
  v_failed int := 0;
  v_stake constant integer := 3;
begin
  for v_tackle in
    select *
    from public.tackles
    where match_id = p_match_id and not is_resolved
    for update
  loop
    v_attacker_pts := public.match_classic_points_earned(v_tackle.attacker_id, p_match_id);
    v_target_pts := public.match_classic_points_earned(v_tackle.target_id, p_match_id);

    if v_attacker_pts > v_target_pts then
      perform public.apply_tackle_points(
        v_tackle.attacker_id,
        v_stake,
        v_tackle.id,
        p_match_id,
        'tackle_bonus'
      );
      perform public.apply_tackle_points(
        v_tackle.target_id,
        -v_stake,
        v_tackle.id,
        p_match_id,
        'tackle_penalty'
      );

      update public.tackles
      set
        is_resolved = true,
        attacker_won = true,
        attacker_delta = v_stake,
        target_delta = -v_stake
      where id = v_tackle.id;

      v_success := v_success + 1;
    else
      perform public.apply_tackle_points(
        v_tackle.attacker_id,
        -v_stake,
        v_tackle.id,
        p_match_id,
        'tackle_penalty'
      );

      update public.tackles
      set
        is_resolved = true,
        attacker_won = false,
        attacker_delta = -v_stake,
        target_delta = 0
      where id = v_tackle.id;

      v_failed := v_failed + 1;
    end if;

    v_resolved := v_resolved + 1;
  end loop;

  return jsonb_build_object(
    'match_id', p_match_id,
    'tackles_resolved', v_resolved,
    'tackles_success', v_success,
    'tackles_failed', v_failed
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- reverse_tackles_for_match : lors de la réouverture d'un match
-- -----------------------------------------------------------------------------
create or replace function public.reverse_tackles_for_match(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tackle record;
  v_reversed int := 0;
begin
  for v_tackle in
    select *
    from public.tackles
    where match_id = p_match_id and is_resolved
    for update
  loop
    if v_tackle.attacker_delta <> 0 then
      perform public.apply_tackle_points(
        v_tackle.attacker_id,
        -v_tackle.attacker_delta,
        v_tackle.id,
        p_match_id,
        case
          when v_tackle.attacker_delta > 0 then 'tackle_penalty'::public.transaction_type
          else 'tackle_bonus'::public.transaction_type
        end
      );
    end if;

    if v_tackle.target_delta <> 0 then
      perform public.apply_tackle_points(
        v_tackle.target_id,
        -v_tackle.target_delta,
        v_tackle.id,
        p_match_id,
        case
          when v_tackle.target_delta > 0 then 'tackle_penalty'::public.transaction_type
          else 'tackle_bonus'::public.transaction_type
        end
      );
    end if;

    update public.tackles
    set
      is_resolved = false,
      attacker_won = null,
      attacker_delta = 0,
      target_delta = 0
    where id = v_tackle.id;

    v_reversed := v_reversed + 1;
  end loop;

  return jsonb_build_object(
    'match_id', p_match_id,
    'tackles_reversed', v_reversed
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- settle_match : + résolution des tacles
-- -----------------------------------------------------------------------------
create or replace function public.settle_match(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_winner text;
  v_bet record;
  v_user_id uuid;
  v_points numeric;
  v_payout numeric;
  v_heat_bonus integer;
  v_pred_home int;
  v_pred_away int;
  v_won int := 0;
  v_lost int := 0;
  v_exact_won int := 0;
  v_tendance_won int := 0;
  v_tackles jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.home_score is null or v_match.away_score is null then
    raise exception 'Final score required';
  end if;

  if v_match.home_score > v_match.away_score then
    v_winner := 'home';
  elsif v_match.home_score < v_match.away_score then
    v_winner := 'away';
  else
    v_winner := 'draw';
  end if;

  for v_bet in
    select * from public.bets
    where match_id = p_match_id and status = 'pending' and bet_type = 'match_result'
    for update
  loop
    if (v_bet.selection ->> 'selection') = v_winner then
      v_payout := v_bet.potential_payout;
      if v_bet.is_boosted then
        v_payout := v_bet.potential_payout * 2;
      end if;
      v_payout := public.golden_match_payout(v_payout, v_match.is_golden);
      v_heat_bonus := public.on_fire_bonus(v_bet.user_id);
      v_payout := v_payout + v_heat_bonus;

      select points into v_points from public.profiles where id = v_bet.user_id for update;

      update public.profiles
      set points = points + v_payout
      where id = v_bet.user_id;

      update public.bets
      set status = 'won', settled_at = now()
      where id = v_bet.id;

      insert into public.transactions (user_id, type, amount, balance_after, bet_id, metadata)
      values (
        v_bet.user_id,
        'bet_payout',
        v_payout,
        v_points + v_payout,
        v_bet.id,
        jsonb_build_object(
          'unit', 'points',
          'boosted', v_bet.is_boosted,
          'golden_match', v_match.is_golden,
          'on_fire_bonus', v_heat_bonus
        )
      );

      v_won := v_won + 1;
    else
      update public.bets
      set status = 'lost', settled_at = now()
      where id = v_bet.id;
      v_lost := v_lost + 1;
    end if;
  end loop;

  for v_bet in
    select * from public.bets
    where match_id = p_match_id and status = 'pending' and bet_type = 'exact_score'
    for update
  loop
    v_pred_home := (v_bet.selection ->> 'home')::int;
    v_pred_away := (v_bet.selection ->> 'away')::int;

    if v_pred_home = v_match.home_score and v_pred_away = v_match.away_score then
      v_payout := public.exact_score_points(v_bet.odd_at_placement, 'exact');
      update public.bets
      set
        status = 'won',
        settled_at = now(),
        score_precision = 'exact',
        potential_payout = v_payout
      where id = v_bet.id;
      v_exact_won := v_exact_won + 1;
    elsif public.match_result_side(v_pred_home, v_pred_away)
      = public.match_result_side(v_match.home_score, v_match.away_score) then
      v_payout := public.exact_score_points(v_bet.odd_at_placement, 'tendance');
      update public.bets
      set
        status = 'won',
        settled_at = now(),
        score_precision = 'tendance',
        potential_payout = v_payout
      where id = v_bet.id;
      v_tendance_won := v_tendance_won + 1;
    else
      update public.bets
      set status = 'lost', settled_at = now(), score_precision = null
      where id = v_bet.id;
      v_lost := v_lost + 1;
      continue;
    end if;

    v_payout := public.golden_match_payout(v_payout, v_match.is_golden);

    update public.bets
    set potential_payout = v_payout
    where id = v_bet.id;

    v_heat_bonus := public.on_fire_bonus(v_bet.user_id);
    v_payout := v_payout + v_heat_bonus;

    select points into v_points from public.profiles where id = v_bet.user_id for update;

    update public.profiles
    set points = points + v_payout
    where id = v_bet.user_id;

    insert into public.transactions (user_id, type, amount, balance_after, bet_id, metadata)
    values (
      v_bet.user_id,
      'bet_payout',
      v_payout,
      v_points + v_payout,
      v_bet.id,
      jsonb_build_object(
        'unit', 'points',
        'score_precision', (select score_precision from public.bets where id = v_bet.id),
        'odd', v_bet.odd_at_placement,
        'golden_match', v_match.is_golden,
        'on_fire_bonus', v_heat_bonus
      )
    );

    v_won := v_won + 1;
  end loop;

  update public.matches
  set status = 'finished', settled_at = now()
  where id = p_match_id;

  v_tackles := public.resolve_tackles_for_match(p_match_id);

  for v_user_id in
    select distinct user_id
    from public.bets
    where match_id = p_match_id
      and bet_type in ('match_result', 'exact_score')
  loop
    perform public.recompute_classic_heat(v_user_id);
  end loop;

  return jsonb_build_object(
    'match_id', p_match_id,
    'winner', v_winner,
    'bets_won', v_won,
    'bets_lost', v_lost,
    'exact_score_exact', v_exact_won,
    'exact_score_tendance', v_tendance_won,
    'golden_match', v_match.is_golden,
    'tackles', v_tackles
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- reopen_match_settlement : + annulation des tacles
-- -----------------------------------------------------------------------------
create or replace function public.reopen_match_settlement(
  p_match_id integer,
  p_target_status public.match_status default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_bet record;
  v_payout numeric;
  v_points numeric;
  v_reopened int := 0;
  v_reversed_points numeric := 0;
  v_user_id uuid;
  v_status public.match_status;
  v_suppress boolean;
  v_tackles jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  v_tackles := public.reverse_tackles_for_match(p_match_id);

  for v_bet in
    select *
    from public.bets
    where match_id = p_match_id
      and bet_type in ('match_result', 'exact_score')
      and status in ('won', 'lost')
    for update
  loop
    if v_bet.status = 'won' then
      select coalesce(sum(t.amount), 0)
      into v_payout
      from public.transactions t
      where t.bet_id = v_bet.id
        and t.type = 'bet_payout';

      if v_payout > 0 then
        select points into v_points
        from public.profiles
        where id = v_bet.user_id
        for update;

        update public.profiles
        set points = points - v_payout
        where id = v_bet.user_id;

        insert into public.transactions (
          user_id,
          type,
          amount,
          balance_after,
          bet_id,
          metadata
        )
        values (
          v_bet.user_id,
          'bet_refund',
          -v_payout,
          v_points - v_payout,
          v_bet.id,
          jsonb_build_object(
            'unit', 'points',
            'reason', 'match_settlement_reversal',
            'match_id', p_match_id
          )
        );

        v_reversed_points := v_reversed_points + v_payout;
      end if;
    end if;

    update public.bets
    set
      status = 'pending',
      settled_at = null,
      score_precision = null,
      potential_payout = case
        when bet_type = 'exact_score' then
          public.exact_score_points(odd_at_placement, 'exact')
        else potential_payout
      end
    where id = v_bet.id;

    v_reopened := v_reopened + 1;
  end loop;

  if v_match.home_score is not null and v_match.away_score is not null then
    v_status := coalesce(p_target_status, 'live');
  else
    v_status := coalesce(p_target_status, 'scheduled');
  end if;

  v_suppress := v_status = 'scheduled';

  update public.matches
  set
    status = v_status,
    settled_at = null,
    suppress_auto_live = v_suppress
  where id = p_match_id;

  for v_user_id in
    select distinct user_id
    from public.bets
    where match_id = p_match_id
      and bet_type in ('match_result', 'exact_score')
  loop
    perform public.recompute_classic_heat(v_user_id);
  end loop;

  return jsonb_build_object(
    'match_id', p_match_id,
    'bets_reopened', v_reopened,
    'points_reversed', v_reversed_points,
    'status', v_status,
    'tackles', v_tackles
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Pronostics pour la Gazette (admin)
-- -----------------------------------------------------------------------------
create or replace function public.get_match_bets_for_summary(p_match_id integer)
returns table (
  username text,
  display_name text,
  bet_type public.bet_type,
  selection jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.username::text,
    p.display_name::text,
    b.bet_type,
    b.selection
  from public.bets b
  join public.profiles p on p.id = b.user_id
  where b.match_id = p_match_id
    and b.status = 'pending'
    and b.bet_type in ('match_result', 'exact_score')
  order by coalesce(p.username, p.display_name, p.id::text);
$$;

grant execute on function public.get_match_bets_for_summary(integer) to authenticated;

create or replace function public.save_match_ai_summary(
  p_match_id integer,
  p_summary text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if exists (
    select 1 from public.matches
    where id = p_match_id and ai_summary is not null
  ) then
    raise exception 'AI summary already generated for this match';
  end if;

  update public.matches
  set ai_summary = left(trim(p_summary), 2000)
  where id = p_match_id;
end;
$$;

grant execute on function public.save_match_ai_summary(integer, text) to authenticated;

notify pgrst, 'reload schema';
