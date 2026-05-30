-- =============================================================================
-- Paris fun, stats leaderboard, ajustement solde admin
-- =============================================================================
-- PRÉREQUIS : exécuter d’abord 004a_add_bet_type_fun.sql (seul), puis ce fichier.

create type public.fun_market_status as enum ('open', 'closed', 'settled');

-- -----------------------------------------------------------------------------
-- Paris fun (questions personnalisées liées à un match)
-- -----------------------------------------------------------------------------
create table public.fun_markets (
  id uuid primary key default gen_random_uuid(),
  match_id integer not null references public.matches (id) on delete cascade,
  question text not null,
  odd_yes numeric(8, 2) not null check (odd_yes >= 1.01),
  odd_no numeric(8, 2) not null check (odd_no >= 1.01),
  status public.fun_market_status not null default 'open',
  winning_outcome text check (winning_outcome in ('yes', 'no')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  settled_at timestamptz
);

create index fun_markets_match_id_idx on public.fun_markets (match_id);
create index fun_markets_status_idx on public.fun_markets (status);

alter table public.fun_markets enable row level security;

create policy "Fun markets readable"
  on public.fun_markets for select to authenticated using (true);

create policy "Admins manage fun markets"
  on public.fun_markets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- RPC : créer un pari fun (admin)
-- -----------------------------------------------------------------------------
create or replace function public.admin_create_fun_market(
  p_match_id integer,
  p_question text,
  p_odd_yes numeric,
  p_odd_no numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  insert into public.fun_markets (
    match_id, question, odd_yes, odd_no, created_by
  )
  values (
    p_match_id, trim(p_question), p_odd_yes, p_odd_no, auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.admin_create_fun_market to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : placer un pari fun (ouvert tant que status = open, ignore kickoff)
-- -----------------------------------------------------------------------------
create or replace function public.place_fun_bet(
  p_market_id uuid,
  p_outcome text,
  p_odd numeric,
  p_stake numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_bet_id uuid;
  v_payout numeric;
  v_market public.fun_markets%rowtype;
  v_expected_odd numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_stake < 1 then
    raise exception 'Minimum stake is 1';
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

  select balance into v_balance from public.profiles where id = v_user_id for update;
  if v_balance < p_stake then
    raise exception 'Insufficient balance';
  end if;

  v_payout := round(p_stake * p_odd, 2);

  update public.profiles set balance = balance - p_stake where id = v_user_id;

  insert into public.bets (
    user_id, match_id, market_id, bet_type, selection,
    odd_at_placement, stake, potential_payout
  )
  values (
    v_user_id, v_market.match_id, p_market_id, 'fun',
    jsonb_build_object('outcome', p_outcome, 'fun_market_id', p_market_id),
    p_odd, p_stake, v_payout
  )
  returning id into v_bet_id;

  insert into public.transactions (user_id, type, amount, balance_after, bet_id)
  values (v_user_id, 'bet_stake', -p_stake, v_balance - p_stake, v_bet_id);

  return v_bet_id;
end;
$$;

grant execute on function public.place_fun_bet to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : clôturer un pari fun (admin choisit oui/non gagnant)
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
  v_balance numeric;
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
      select balance into v_balance from public.profiles where id = v_bet.user_id for update;
      update public.profiles set balance = balance + v_bet.potential_payout where id = v_bet.user_id;
      update public.bets set status = 'won', settled_at = now() where id = v_bet.id;
      insert into public.transactions (user_id, type, amount, balance_after, bet_id)
      values (v_bet.user_id, 'bet_payout', v_bet.potential_payout, v_balance + v_bet.potential_payout, v_bet.id);
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

grant execute on function public.settle_fun_market to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : ajuster le solde d'un joueur (admin)
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
  v_balance numeric;
  v_new_balance numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select balance into v_balance from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found';
  end if;

  v_new_balance := v_balance + p_amount;
  if v_new_balance < 0 then
    raise exception 'Balance cannot be negative';
  end if;

  update public.profiles set balance = v_new_balance where id = p_user_id;

  insert into public.transactions (user_id, type, amount, balance_after, metadata)
  values (
    p_user_id,
    'admin_adjustment',
    p_amount,
    v_new_balance,
    jsonb_build_object('reason', coalesce(p_reason, ''))
  );

  return v_new_balance;
end;
$$;

grant execute on function public.admin_adjust_balance to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : classement enrichi (stats gagnés / perdus)
-- -----------------------------------------------------------------------------
create or replace function public.get_leaderboard_stats()
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
  select
    p.id,
    p.display_name,
    p.username,
    p.balance,
    coalesce(sum(case when b.bet_type in ('match_result', 'exact_score', 'goalscorer') and b.status = 'won' then 1 else 0 end), 0)::bigint as classic_won,
    coalesce(sum(case when b.bet_type in ('match_result', 'exact_score', 'goalscorer') and b.status = 'lost' then 1 else 0 end), 0)::bigint as classic_lost,
    coalesce(sum(case when b.bet_type = 'fun' and b.status = 'won' then 1 else 0 end), 0)::bigint as fun_won,
    coalesce(sum(case when b.bet_type = 'fun' and b.status = 'lost' then 1 else 0 end), 0)::bigint as fun_lost,
    coalesce(sum(case when b.status = 'won' then 1 else 0 end), 0)::bigint as total_won,
    coalesce(sum(case when b.status = 'lost' then 1 else 0 end), 0)::bigint as total_lost
  from public.profiles p
  left join public.bets b on b.user_id = p.id
  group by p.id, p.display_name, p.username, p.balance
  order by p.balance desc;
$$;

grant execute on function public.get_leaderboard_stats to authenticated;

-- Policy : admins peuvent lire tous les profils (déjà select true) — ok
