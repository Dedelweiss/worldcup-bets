-- Joker unique « Boost x2 » : double les gains sur un pari classique 1N2

alter table public.profiles
  add column if not exists boosts_available integer not null default 1;

alter table public.profiles
  drop constraint if exists profiles_boosts_available_check;

alter table public.profiles
  add constraint profiles_boosts_available_check
  check (boosts_available >= 0);

comment on column public.profiles.boosts_available is
  'Jokers Boost x2 restants pour le tournoi (1 par défaut, 0 après utilisation)';

alter table public.bets
  add column if not exists is_boosted boolean not null default false;

comment on column public.bets.is_boosted is
  'Si true, les points gagnés à la clôture sont le double du gain potentiel de base';

update public.profiles
set boosts_available = 1
where boosts_available is null;

-- -----------------------------------------------------------------------------
-- Placer un pari classique (avec option Boost x2)
-- -----------------------------------------------------------------------------
create or replace function public.place_bet(
  p_match_id integer,
  p_bet_type public.bet_type,
  p_selection jsonb,
  p_odd numeric,
  p_stake numeric default null,
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
  v_match public.matches%rowtype;
  v_selection text;
  v_expected_odd numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_use_boost and p_bet_type <> 'match_result' then
    raise exception 'Boost only allowed on classic match bets';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.status <> 'scheduled' then
    raise exception 'Betting is closed for this match';
  end if;

  if v_match.kickoff_at <= now() then
    raise exception 'Match has already started';
  end if;

  if p_bet_type = 'match_result' then
    v_selection := p_selection ->> 'selection';
    if v_selection = 'home' then
      v_expected_odd := v_match.odd_home;
    elsif v_selection = 'draw' then
      v_expected_odd := v_match.odd_draw;
    elsif v_selection = 'away' then
      v_expected_odd := v_match.odd_away;
    else
      raise exception 'Invalid selection';
    end if;

    if v_expected_odd is null then
      raise exception 'Odds not available';
    end if;

    if abs(p_odd - v_expected_odd) > 0.01 then
      raise exception 'Odds have changed, please refresh';
    end if;
  end if;

  if p_use_boost then
    select boosts_available into v_boosts
    from public.profiles
    where id = v_user_id
    for update;

    if not found then
      raise exception 'Profile not found';
    end if;

    if v_boosts < 1 then
      raise exception 'No boost available';
    end if;

    update public.profiles
    set boosts_available = boosts_available - 1
    where id = v_user_id;
  end if;

  v_points := public.points_from_odd(p_odd);

  insert into public.bets (
    user_id, match_id, bet_type, selection,
    odd_at_placement, stake, potential_payout, is_boosted
  )
  values (
    v_user_id, p_match_id, p_bet_type, p_selection,
    p_odd, 0, v_points, coalesce(p_use_boost, false)
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Clôture match 1N2 : crédit points (x2 si boost)
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
  v_points numeric;
  v_payout numeric;
  v_won int := 0;
  v_lost int := 0;
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
          'boosted', v_bet.is_boosted
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

  update public.matches
  set status = 'finished', settled_at = now()
  where id = p_match_id;

  return jsonb_build_object(
    'match_id', p_match_id,
    'winner', v_winner,
    'bets_won', v_won,
    'bets_lost', v_lost
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Reset app : réinitialiser les jokers
-- -----------------------------------------------------------------------------
create or replace function public.admin_reset_app(
  p_starting_balance numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bets_deleted bigint;
  v_fun_deleted bigint;
  v_profiles_reset bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_starting_balance < 0 then
    raise exception 'Starting points must be >= 0';
  end if;

  delete from public.bets where true;
  get diagnostics v_bets_deleted = row_count;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'fun_markets'
  ) then
    delete from public.fun_markets where true;
    get diagnostics v_fun_deleted = row_count;
  end if;

  delete from public.transactions where true;

  update public.profiles
  set points = p_starting_balance,
      boosts_available = 1;
  get diagnostics v_profiles_reset = row_count;

  return jsonb_build_object(
    'bets_deleted', v_bets_deleted,
    'fun_markets_deleted', coalesce(v_fun_deleted, 0),
    'profiles_reset', v_profiles_reset,
    'starting_points', p_starting_balance
  );
end;
$$;
