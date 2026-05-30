-- =============================================================================
-- Mode admin manuel — rôles, gestion matchs, clôture des paris
-- Exécuter après 001_initial_schema.sql
-- =============================================================================

create type public.user_role as enum ('user', 'admin');

alter table public.profiles
  add column if not exists role public.user_role not null default 'user';

comment on column public.profiles.role is 'admin = accès /admin et gestion des matchs';

-- Séquences pour créations manuelles (évite conflit avec seed / anciens IDs API)
create sequence if not exists public.manual_team_id_seq start with 10000;
create sequence if not exists public.manual_match_id_seq start with 10000;

-- Champs optionnels pour gestion admin
alter table public.matches
  add column if not exists admin_notes text,
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Helpers sécurité
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- RLS admin : équipes & matchs
-- -----------------------------------------------------------------------------
create policy "Admins insert teams"
  on public.teams for insert to authenticated
  with check (public.is_admin());

create policy "Admins update teams"
  on public.teams for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admins insert matches"
  on public.matches for insert to authenticated
  with check (public.is_admin());

create policy "Admins update matches"
  on public.matches for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admins delete matches"
  on public.matches for delete to authenticated
  using (public.is_admin());

create policy "Admins view all bets"
  on public.bets for select to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- RPC : créer un match manuellement (équipes + cotes 1N2)
-- -----------------------------------------------------------------------------
create or replace function public.admin_create_match(
  p_home_team_name text,
  p_away_team_name text,
  p_kickoff_at timestamptz,
  p_odd_home numeric,
  p_odd_draw numeric,
  p_odd_away numeric,
  p_round text default null,
  p_venue text default null,
  p_home_team_code text default null,
  p_away_team_code text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_home_id integer;
  v_away_id integer;
  v_match_id integer;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_odd_home < 1.01 or p_odd_draw < 1.01 or p_odd_away < 1.01 then
    raise exception 'Odds must be >= 1.01';
  end if;

  v_home_id := nextval('public.manual_team_id_seq');
  insert into public.teams (id, name, code) values (v_home_id, trim(p_home_team_name), p_home_team_code);

  v_away_id := nextval('public.manual_team_id_seq');
  insert into public.teams (id, name, code) values (v_away_id, trim(p_away_team_name), p_away_team_code);

  v_match_id := nextval('public.manual_match_id_seq');
  insert into public.matches (
    id, round, status, kickoff_at, venue,
    home_team_id, away_team_id,
    odd_home, odd_draw, odd_away,
    created_by
  ) values (
    v_match_id, p_round, 'scheduled', p_kickoff_at, p_venue,
    v_home_id, v_away_id,
    p_odd_home, p_odd_draw, p_away,
    auth.uid()
  );

  return v_match_id;
end;
$$;

grant execute on function public.admin_create_match to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : mettre à jour statut / score d'un match
-- -----------------------------------------------------------------------------
create or replace function public.admin_update_match(
  p_match_id integer,
  p_status public.match_status default null,
  p_home_score integer default null,
  p_away_score integer default null,
  p_odd_home numeric default null,
  p_odd_draw numeric default null,
  p_odd_away numeric default null,
  p_round text default null,
  p_venue text default null
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

  update public.matches
  set
    status = coalesce(p_status, status),
    home_score = coalesce(p_home_score, home_score),
    away_score = coalesce(p_away_score, away_score),
    odd_home = coalesce(p_odd_home, odd_home),
    odd_draw = coalesce(p_odd_draw, odd_draw),
    odd_away = coalesce(p_odd_away, odd_away),
    round = coalesce(p_round, round),
    venue = coalesce(p_venue, venue)
  where id = p_match_id;

  if not found then
    raise exception 'Match not found';
  end if;
end;
$$;

grant execute on function public.admin_update_match to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : clôturer le match & payer les gagnants (1N2 uniquement)
-- -----------------------------------------------------------------------------
create or replace function public.settle_match(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_winner text; -- home | draw | away
  v_bet record;
  v_balance numeric;
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
      select balance into v_balance from public.profiles where id = v_bet.user_id for update;

      update public.profiles
      set balance = balance + v_bet.potential_payout
      where id = v_bet.user_id;

      update public.bets
      set status = 'won', settled_at = now()
      where id = v_bet.id;

      insert into public.transactions (user_id, type, amount, balance_after, bet_id)
      values (
        v_bet.user_id,
        'bet_payout',
        v_bet.potential_payout,
        v_balance + v_bet.potential_payout,
        v_bet.id
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

grant execute on function public.settle_match to authenticated;

-- -----------------------------------------------------------------------------
-- Promouvoir le premier admin (à exécuter une fois avec votre user id)
-- -----------------------------------------------------------------------------
-- update public.profiles set role = 'admin' where id = 'VOTRE-UUID-ICI';
