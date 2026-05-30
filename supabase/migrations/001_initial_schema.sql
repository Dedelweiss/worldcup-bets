-- =============================================================================
-- World Cup Bets — Schéma initial Supabase
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
create type public.match_status as enum (
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled'
);

create type public.bet_type as enum (
  'match_result',   -- 1N2
  'exact_score',
  'goalscorer'
);

create type public.bet_status as enum (
  'pending',
  'won',
  'lost',
  'void',
  'cancelled'
);

create type public.transaction_type as enum (
  'signup_bonus',
  'bet_stake',
  'bet_payout',
  'bet_refund',
  'admin_adjustment'
);

-- -----------------------------------------------------------------------------
-- PROFILES (extension de auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  balance numeric(12, 2) not null default 100.00 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil joueur + portefeuille virtuel (bankroll)';

-- -----------------------------------------------------------------------------
-- GROUPS (amis / ligues privées)
-- -----------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  invite_code text unique not null default encode(gen_random_bytes(6), 'hex'),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- -----------------------------------------------------------------------------
-- TEAMS & MATCHES (cache API-Football)
-- -----------------------------------------------------------------------------
create table public.teams (
  id integer primary key, -- ID API-Football
  name text not null,
  code text,
  logo_url text,
  updated_at timestamptz not null default now()
);

create table public.matches (
  id integer primary key, -- fixture_id API-Football
  api_league_id integer not null default 1, -- World Cup
  season integer not null default 2026,
  round text,
  status public.match_status not null default 'scheduled',
  kickoff_at timestamptz not null,
  venue text,
  home_team_id integer not null references public.teams (id),
  away_team_id integer not null references public.teams (id),
  home_score integer,
  away_score integer,
  -- Cotes pré-match (1N2), mises à jour par cron
  odd_home numeric(6, 2),
  odd_draw numeric(6, 2),
  odd_away numeric(6, 2),
  raw_api_payload jsonb,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matches_kickoff_idx on public.matches (kickoff_at);
create index matches_status_idx on public.matches (status);

-- -----------------------------------------------------------------------------
-- MARKETS (marchés de paris par match)
-- -----------------------------------------------------------------------------
create table public.bet_markets (
  id uuid primary key default gen_random_uuid(),
  match_id integer not null references public.matches (id) on delete cascade,
  bet_type public.bet_type not null,
  label text not null,
  -- Ex: { "selection": "home" } | { "score": "2-1" } | { "player_id": 123 }
  selection_key jsonb not null,
  odd numeric(8, 2) not null check (odd >= 1.01),
  is_active boolean not null default true,
  unique (match_id, bet_type, selection_key)
);

-- -----------------------------------------------------------------------------
-- BETS
-- -----------------------------------------------------------------------------
create table public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id integer not null references public.matches (id) on delete restrict,
  market_id uuid references public.bet_markets (id) on delete set null,
  bet_type public.bet_type not null,
  selection jsonb not null,
  odd_at_placement numeric(8, 2) not null,
  stake numeric(12, 2) not null check (stake > 0),
  potential_payout numeric(12, 2) not null,
  status public.bet_status not null default 'pending',
  placed_at timestamptz not null default now(),
  settled_at timestamptz
);

create index bets_user_id_idx on public.bets (user_id);
create index bets_match_status_idx on public.bets (match_id, status);

-- -----------------------------------------------------------------------------
-- TRANSACTIONS (ledger immuable)
-- -----------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(12, 2) not null, -- positif = crédit, négatif = débit
  balance_after numeric(12, 2) not null,
  bet_id uuid references public.bets (id) on delete set null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index transactions_user_id_idx on public.transactions (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- TRIGGERS : profil à l'inscription + bonus 100€
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.transactions (user_id, type, amount, balance_after, metadata)
  values (new.id, 'signup_bonus', 100.00, 100.00, '{"currency": "EUR", "virtual": true}'::jsonb);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.bet_markets enable row level security;
alter table public.bets enable row level security;
alter table public.transactions enable row level security;

-- Profiles : lecture publique pour leaderboard, écriture propre profil
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Matches / teams / markets : lecture pour tous les connectés
create policy "Teams readable" on public.teams for select to authenticated using (true);
create policy "Matches readable" on public.matches for select to authenticated using (true);
create policy "Markets readable" on public.bet_markets for select to authenticated using (true);

-- Bets : CRUD limité au propriétaire
create policy "Users view own bets"
  on public.bets for select to authenticated using (auth.uid() = user_id);

create policy "Users insert own bets"
  on public.bets for insert to authenticated with check (auth.uid() = user_id);

-- Transactions : lecture propre historique
create policy "Users view own transactions"
  on public.transactions for select to authenticated using (auth.uid() = user_id);

-- Groups : membres uniquement
create policy "Group members can view group"
  on public.groups for select to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );

create policy "Group members list"
  on public.group_members for select to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- RPC : placer un pari (débit atomique)
-- -----------------------------------------------------------------------------
create or replace function public.place_bet(
  p_match_id integer,
  p_bet_type public.bet_type,
  p_selection jsonb,
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
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select balance into v_balance from public.profiles where id = v_user_id for update;
  if v_balance < p_stake then
    raise exception 'Insufficient balance';
  end if;

  v_payout := round(p_stake * p_odd, 2);

  update public.profiles
  set balance = balance - p_stake
  where id = v_user_id;

  insert into public.bets (
    user_id, match_id, bet_type, selection,
    odd_at_placement, stake, potential_payout
  )
  values (
    v_user_id, p_match_id, p_bet_type, p_selection,
    p_odd, p_stake, v_payout
  )
  returning id into v_bet_id;

  insert into public.transactions (user_id, type, amount, balance_after, bet_id)
  values (
    v_user_id,
    'bet_stake',
    -p_stake,
    v_balance - p_stake,
    v_bet_id
  );

  return v_bet_id;
end;
$$;

grant execute on function public.place_bet to authenticated;
