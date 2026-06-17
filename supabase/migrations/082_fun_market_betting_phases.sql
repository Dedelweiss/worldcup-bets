-- Types de paris fun : pré-match (fermé au coup d'envoi) ou live (fenêtre 2 min).

create type public.fun_betting_phase as enum ('pre_match', 'live_window');

alter table public.fun_markets
  add column if not exists betting_phase public.fun_betting_phase not null default 'pre_match';

alter table public.fun_markets
  add column if not exists closes_at timestamptz;

comment on column public.fun_markets.closes_at is
  'Fin de fenêtre de pari (live_window) — distinct de closed_at (fermeture effective).';

comment on column public.fun_markets.betting_phase is
  'pre_match : pariable avant le coup d''envoi uniquement. live_window : fenêtre courte en direct.';

update public.fun_markets
set betting_phase = 'pre_match'
where betting_phase is null;

-- -----------------------------------------------------------------------------
-- Fermeture automatique (pré-match au coup d'envoi, live fenêtre expirée)
-- -----------------------------------------------------------------------------
create or replace function public.close_due_fun_markets()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_n integer;
begin
  update public.fun_markets fm
  set
    status = 'closed',
    closed_at = coalesce(fm.closed_at, now())
  from public.matches m
  where fm.match_id = m.id
    and fm.status = 'open'
    and fm.betting_phase = 'pre_match'
    and m.kickoff_at <= now();

  get diagnostics v_n = row_count;
  v_count := v_count + v_n;

  update public.fun_markets
  set
    status = 'closed',
    closed_at = coalesce(closed_at, now())
  where status = 'open'
    and betting_phase = 'live_window'
    and closes_at is not null
    and closes_at <= now();

  get diagnostics v_n = row_count;
  v_count := v_count + v_n;

  return v_count;
end;
$$;

revoke all on function public.close_due_fun_markets() from public;
grant execute on function public.close_due_fun_markets() to service_role;

-- -----------------------------------------------------------------------------
-- sync_live_matches : fermer les paris fun pré-match quand le match passe en live
-- -----------------------------------------------------------------------------
create or replace function public.sync_live_matches()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.close_due_fun_markets();

  update public.matches
  set
    status = 'live',
    updated_at = now()
  where status = 'scheduled'
    and kickoff_at <= now()
    and coalesce(suppress_auto_live, false) = false;

  get diagnostics v_count = row_count;

  if v_count > 0 then
    update public.fun_markets fm
    set
      status = 'closed',
      closed_at = coalesce(fm.closed_at, now())
    from public.matches m
    where fm.match_id = m.id
      and fm.status = 'open'
      and fm.betting_phase = 'pre_match'
      and m.status = 'live'
      and m.kickoff_at <= now();
  end if;

  perform public.close_due_fun_markets();

  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Création marché fun (phase de pari)
-- -----------------------------------------------------------------------------
drop function if exists public.admin_create_fun_market(integer, text, numeric, numeric);

create or replace function public.admin_create_fun_market(
  p_match_id integer,
  p_question text,
  p_odd_yes numeric,
  p_odd_no numeric,
  p_betting_phase text default 'pre_match'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_match public.matches%rowtype;
  v_phase public.fun_betting_phase;
  v_question text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  v_question := trim(p_question);
  if char_length(v_question) < 3 then
    raise exception 'Question too short';
  end if;

  if p_odd_yes < 1.01 or p_odd_no < 1.01 then
    raise exception 'Invalid odds';
  end if;

  if p_betting_phase not in ('pre_match', 'live_window') then
    raise exception 'Invalid betting phase';
  end if;

  v_phase := p_betting_phase::public.fun_betting_phase;

  select * into v_match from public.matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_phase = 'pre_match' then
    if v_match.status <> 'scheduled' then
      raise exception 'Pre-match fun markets require a scheduled match';
    end if;
    if v_match.kickoff_at <= now() then
      raise exception 'Kickoff has passed — use a live window market instead';
    end if;

    insert into public.fun_markets (
      match_id, question, odd_yes, odd_no, created_by, betting_phase
    )
    values (
      p_match_id, v_question, p_odd_yes, p_odd_no, auth.uid(), v_phase
    )
    returning id into v_id;
  else
    if v_match.status <> 'live' then
      raise exception 'Live window markets require a live match';
    end if;

    insert into public.fun_markets (
      match_id,
      question,
      odd_yes,
      odd_no,
      created_by,
      betting_phase,
      closes_at
    )
    values (
      p_match_id,
      v_question,
      p_odd_yes,
      p_odd_no,
      auth.uid(),
      v_phase,
      now() + interval '2 minutes'
    )
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Fermeture manuelle des paris (admin)
-- -----------------------------------------------------------------------------
create or replace function public.admin_close_fun_market(p_market_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.fun_markets%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_market
  from public.fun_markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Fun market not found';
  end if;

  if v_market.status <> 'open' then
    raise exception 'Only open fun markets can be closed';
  end if;

  update public.fun_markets
  set
    status = 'closed',
    closed_at = now()
  where id = p_market_id;
end;
$$;

grant execute on function public.admin_close_fun_market(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Placement pari fun (respect des phases)
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
  v_match public.matches%rowtype;
  v_expected_odd numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.close_due_fun_markets();

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

  select * into v_match from public.matches where id = v_market.match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_market.betting_phase = 'pre_match' then
    if v_match.status <> 'scheduled' or v_match.kickoff_at <= now() then
      raise exception 'Fun betting is closed';
    end if;
  elsif v_market.betting_phase = 'live_window' then
    if v_match.status <> 'live' then
      raise exception 'Fun betting is closed';
    end if;
    if v_market.closes_at is not null and now() > v_market.closes_at then
      raise exception 'Fun betting is closed';
    end if;
  end if;

  if exists (
    select 1 from public.bets
    where user_id = v_user_id
      and bet_type = 'fun'
      and status = 'pending'
      and (
        fun_market_id = p_market_id
        or market_id = p_market_id
      )
  ) then
    raise exception 'You already have a pending fun bet on this market';
  end if;

  v_expected_odd := case when p_outcome = 'yes' then v_market.odd_yes else v_market.odd_no end;

  if abs(p_odd - v_expected_odd) > 0.01 then
    raise exception 'Odds have changed, please refresh';
  end if;

  v_points := public.points_from_odd(p_odd);

  insert into public.bets (
    user_id, match_id, market_id, fun_market_id, bet_type, selection,
    odd_at_placement, stake, potential_payout
  )
  values (
    v_user_id,
    v_market.match_id,
    null,
    p_market_id,
    'fun',
    jsonb_build_object('outcome', p_outcome, 'fun_market_id', p_market_id),
    p_odd,
    0,
    v_points
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

grant execute on function public.admin_create_fun_market(integer, text, numeric, numeric, text) to authenticated;

notify pgrst, 'reload schema';
