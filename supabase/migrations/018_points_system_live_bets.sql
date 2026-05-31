-- Système de points (sans mise / bankroll) + visibilité des paris en direct
-- Points gagnés si pari correct : round(cote × 10), minimum 1

-- -----------------------------------------------------------------------------
-- Profils : balance → points
-- -----------------------------------------------------------------------------
alter table public.profiles rename column balance to points;

alter table public.profiles
  alter column points set default 0;

comment on column public.profiles.points is
  'Points cumulés — gain à la clôture = round(cote × 10), aucune mise débitée';

-- -----------------------------------------------------------------------------
-- Paris : mise optionnelle (0), gain potentiel = points
-- -----------------------------------------------------------------------------
alter table public.bets drop constraint if exists bets_stake_check;

alter table public.bets
  alter column stake set default 0;

alter table public.bets
  add constraint bets_stake_check check (stake >= 0);

create or replace function public.points_from_odd(p_odd numeric)
returns integer
language sql
immutable
as $$
  select greatest(1, round(p_odd * 10)::integer);
$$;

-- -----------------------------------------------------------------------------
-- Inscription : pas de bonus €
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, points)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    0
  );

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Placer un pari 1N2 (sans débit de solde)
-- -----------------------------------------------------------------------------
create or replace function public.place_bet(
  p_match_id integer,
  p_bet_type public.bet_type,
  p_selection jsonb,
  p_odd numeric,
  p_stake numeric default null
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
  v_match public.matches%rowtype;
  v_selection text;
  v_expected_odd numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
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

  v_points := public.points_from_odd(p_odd);

  insert into public.bets (
    user_id, match_id, bet_type, selection,
    odd_at_placement, stake, potential_payout
  )
  values (
    v_user_id, p_match_id, p_bet_type, p_selection,
    p_odd, 0, v_points
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Pari fun (sans débit)
-- -----------------------------------------------------------------------------
create or replace function public.place_fun_bet(
  p_market_id uuid,
  p_outcome text,
  p_odd numeric,
  p_stake numeric default null
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
  v_market public.fun_markets%rowtype;
  v_expected_odd numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_outcome not in ('yes', 'no') then
    raise exception 'Invalid outcome';
  end if;

  select * into v_market from public.fun_markets where id = p_market_id;
  if not found then
    raise exception 'Fun market not found';
  end if;

  if v_market.status <> 'open' then
    raise exception 'Fun betting is closed';
  end if;

  v_expected_odd := case when p_outcome = 'yes' then v_market.odd_yes else v_market.odd_no end;

  if abs(p_odd - v_expected_odd) > 0.01 then
    raise exception 'Odds have changed, please refresh';
  end if;

  v_points := public.points_from_odd(p_odd);

  insert into public.bets (
    user_id, match_id, market_id, bet_type, selection,
    odd_at_placement, stake, potential_payout
  )
  values (
    v_user_id, v_market.match_id, p_market_id, 'fun',
    jsonb_build_object('outcome', p_outcome, 'fun_market_id', p_market_id),
    p_odd, 0, v_points
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Clôture match 1N2 → crédit points
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
      select points into v_points from public.profiles where id = v_bet.user_id for update;

      update public.profiles
      set points = points + v_bet.potential_payout
      where id = v_bet.user_id;

      update public.bets
      set status = 'won', settled_at = now()
      where id = v_bet.id;

      insert into public.transactions (user_id, type, amount, balance_after, bet_id, metadata)
      values (
        v_bet.user_id,
        'bet_payout',
        v_bet.potential_payout,
        v_points + v_bet.potential_payout,
        v_bet.id,
        jsonb_build_object('unit', 'points')
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
-- Clôture pari fun
-- -----------------------------------------------------------------------------
create or replace function public.settle_fun_market(
  p_market_id uuid,
  p_winning_outcome text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.fun_markets%rowtype;
  v_bet record;
  v_points numeric;
  v_won int := 0;
  v_lost int := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_winning_outcome not in ('yes', 'no') then
    raise exception 'Invalid winning outcome';
  end if;

  select * into v_market from public.fun_markets where id = p_market_id for update;
  if not found then
    raise exception 'Fun market not found';
  end if;

  for v_bet in
    select * from public.bets
    where market_id = p_market_id and status = 'pending' and bet_type = 'fun'
    for update
  loop
    if (v_bet.selection ->> 'outcome') = p_winning_outcome then
      select points into v_points from public.profiles where id = v_bet.user_id for update;
      update public.profiles
      set points = points + v_bet.potential_payout
      where id = v_bet.user_id;
      update public.bets set status = 'won', settled_at = now() where id = v_bet.id;
      insert into public.transactions (user_id, type, amount, balance_after, bet_id, metadata)
      values (
        v_bet.user_id,
        'bet_payout',
        v_bet.potential_payout,
        v_points + v_bet.potential_payout,
        v_bet.id,
        jsonb_build_object('unit', 'points')
      );
      v_won := v_won + 1;
    else
      update public.bets set status = 'lost', settled_at = now() where id = v_bet.id;
      v_lost := v_lost + 1;
    end if;
  end loop;

  update public.fun_markets
  set status = 'settled', winning_outcome = p_winning_outcome, settled_at = now()
  where id = p_market_id;

  return jsonb_build_object('market_id', p_market_id, 'bets_won', v_won, 'bets_lost', v_lost);
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin : ajuster les points
-- -----------------------------------------------------------------------------
create or replace function public.admin_adjust_balance(
  p_user_id uuid,
  p_amount numeric,
  p_reason text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points numeric;
  v_new_points numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_amount = 0 then
    raise exception 'Amount cannot be zero';
  end if;

  select points into v_points
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User not found';
  end if;

  v_new_points := v_points + p_amount;

  if v_new_points < 0 then
    raise exception 'Points cannot be negative';
  end if;

  update public.profiles set points = v_new_points where id = p_user_id;

  insert into public.transactions (user_id, type, amount, balance_after, metadata)
  values (
    p_user_id,
    'admin_adjustment',
    p_amount,
    v_new_points,
    jsonb_build_object('reason', p_reason, 'unit', 'points')
  );

  return v_new_points;
end;
$$;

-- -----------------------------------------------------------------------------
-- Classement : tri par points (alias balance conservé pour l''API)
-- -----------------------------------------------------------------------------
create or replace function public.get_leaderboard_filtered(
  p_league_id uuid default null,
  p_sort_by text default 'points'
)
returns table (
  id uuid,
  display_name text,
  username text,
  balance numeric,
  classic_won bigint,
  classic_lost bigint,
  fun_won bigint,
  fun_lost bigint,
  total_won bigint,
  total_lost bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with stats as (
    select
      p.id,
      p.display_name,
      p.username,
      p.points as balance,
      coalesce(
        sum(
          case
            when b.bet_type in ('match_result', 'exact_score', 'goalscorer')
              and b.status = 'won'
            then 1
            else 0
          end
        ),
        0
      )::bigint as classic_won,
      coalesce(
        sum(
          case
            when b.bet_type in ('match_result', 'exact_score', 'goalscorer')
              and b.status = 'lost'
            then 1
            else 0
          end
        ),
        0
      )::bigint as classic_lost,
      coalesce(
        sum(case when b.bet_type = 'fun' and b.status = 'won' then 1 else 0 end),
        0
      )::bigint as fun_won,
      coalesce(
        sum(case when b.bet_type = 'fun' and b.status = 'lost' then 1 else 0 end),
        0
      )::bigint as fun_lost,
      coalesce(sum(case when b.status = 'won' then 1 else 0 end), 0)::bigint as total_won,
      coalesce(sum(case when b.status = 'lost' then 1 else 0 end), 0)::bigint as total_lost
    from public.profiles p
    left join public.bets b on b.user_id = p.id
    where
      p_league_id is null
      or p.id in (
        select lm.user_id
        from public.league_members lm
        where lm.league_id = p_league_id
      )
    group by p.id, p.display_name, p.username, p.points
  )
  select *
  from stats
  order by
    case coalesce(p_sort_by, 'points')
      when 'classic_won' then classic_won
      when 'fun_won' then fun_won
      when 'balance' then balance
      else balance
    end desc nulls last,
    balance desc,
    total_won desc;
$$;

-- -----------------------------------------------------------------------------
-- Reset app : points à 0
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

  update public.profiles set points = p_starting_balance;
  get diagnostics v_profiles_reset = row_count;

  return jsonb_build_object(
    'bets_deleted', v_bets_deleted,
    'fun_markets_deleted', coalesce(v_fun_deleted, 0),
    'profiles_reset', v_profiles_reset,
    'starting_points', p_starting_balance
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS : voir les paris des autres sur un match EN DIRECT uniquement
-- -----------------------------------------------------------------------------
drop policy if exists "Users view own bets" on public.bets;

create policy "Users view own bets"
  on public.bets for select to authenticated
  using (auth.uid() = user_id);

create policy "Users view bets on live matches"
  on public.bets for select to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = bets.match_id
        and m.status = 'live'
    )
  );

notify pgrst, 'reload schema';
