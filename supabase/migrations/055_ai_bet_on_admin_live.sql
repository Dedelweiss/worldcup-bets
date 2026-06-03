-- Pari IA : aligné sur le passage admin en direct (pas seulement kickoff_at <= now()).

create or replace function public.get_matches_needing_ai_bet()
returns table (
  match_id integer,
  home_team_name text,
  away_team_name text,
  odd_home numeric,
  odd_draw numeric,
  odd_away numeric,
  kickoff_at timestamptz,
  status public.match_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as match_id,
    ht.name as home_team_name,
    at.name as away_team_name,
    m.odd_home,
    m.odd_draw,
    m.odd_away,
    m.kickoff_at,
    m.status
  from public.matches m
  join public.teams ht on ht.id = m.home_team_id
  join public.teams at on at.id = m.away_team_id
  where m.status not in ('postponed', 'cancelled')
    and m.settled_at is null
    and (
      m.status in ('live', 'finished')
      or m.kickoff_at <= now()
    )
    and not exists (
      select 1
      from public.bets b
      where b.match_id = m.id
        and b.user_id = public.ai_player_id()
        and b.bet_type = 'exact_score'
        and b.status in ('pending', 'won', 'lost')
    );
$$;

create or replace function public.place_ai_exact_score_bet(
  p_match_id integer,
  p_home integer,
  p_away integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ai_id uuid := public.ai_player_id();
  v_match public.matches%rowtype;
  v_side text;
  v_expected_odd numeric;
  v_points integer;
  v_bet_id uuid;
begin
  if not exists (select 1 from public.profiles where id = v_ai_id and is_ai) then
    raise exception 'AI player not configured';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.status in ('postponed', 'cancelled') then
    raise exception 'Match not bettable';
  end if;

  if v_match.status not in ('live', 'finished') and v_match.kickoff_at > now() then
    raise exception 'Match has not started';
  end if;

  if v_match.settled_at is not null then
    raise exception 'Match already settled';
  end if;

  if exists (
    select 1
    from public.bets b
    where b.user_id = v_ai_id
      and b.match_id = p_match_id
      and b.bet_type = 'exact_score'
      and b.status in ('pending', 'won', 'lost')
  ) then
    raise exception 'AI bet already placed';
  end if;

  if p_home is null or p_away is null or p_home < 0 or p_away < 0 or p_home > 20 or p_away > 20 then
    raise exception 'Invalid exact score';
  end if;

  v_side := public.match_result_side(p_home, p_away);
  v_expected_odd := public.odd_for_result_side(
    v_match.odd_home,
    v_match.odd_draw,
    v_match.odd_away,
    v_side
  );

  if v_expected_odd is null then
    raise exception 'Odds not available for predicted result';
  end if;

  v_points := public.exact_score_points(v_expected_odd, 'exact');

  insert into public.bets (
    user_id,
    match_id,
    bet_type,
    selection,
    odd_at_placement,
    stake,
    potential_payout,
    is_boosted,
    score_precision
  )
  values (
    v_ai_id,
    p_match_id,
    'exact_score',
    jsonb_build_object('home', p_home, 'away', p_away),
    v_expected_odd,
    0,
    v_points,
    false,
    null
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

drop function if exists public.get_match_betting_participation(integer);

create or replace function public.get_match_betting_participation(p_match_id integer)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  has_bet boolean,
  has_match_result boolean,
  has_exact_score boolean,
  is_ai boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id as user_id,
    p.username::text,
    p.display_name::text,
    p.avatar_url::text,
    exists (
      select 1
      from public.bets b
      where b.match_id = p_match_id
        and b.user_id = p.id
        and b.status in ('pending', 'won', 'lost')
        and b.bet_type in ('match_result', 'exact_score')
    ) as has_bet,
    exists (
      select 1
      from public.bets b
      where b.match_id = p_match_id
        and b.user_id = p.id
        and b.status in ('pending', 'won', 'lost')
        and b.bet_type = 'match_result'
    ) as has_match_result,
    exists (
      select 1
      from public.bets b
      where b.match_id = p_match_id
        and b.user_id = p.id
        and b.status in ('pending', 'won', 'lost')
        and b.bet_type = 'exact_score'
    ) as has_exact_score,
    coalesce(p.is_ai, false) as is_ai
  from public.profiles p
  cross join lateral (
    select m.kickoff_at, m.status
    from public.matches m
    where m.id = p_match_id
  ) match_info
  where
    (p.role in ('user', 'admin') and not coalesce(p.is_ai, false))
    or (
      coalesce(p.is_ai, false)
      and (
        match_info.status in ('live', 'finished')
        or match_info.kickoff_at <= now()
      )
    )
  order by is_ai desc, has_bet desc, coalesce(p.username, p.display_name, p.id::text) asc;
$$;

grant execute on function public.get_match_betting_participation(integer) to authenticated;

notify pgrst, 'reload schema';
