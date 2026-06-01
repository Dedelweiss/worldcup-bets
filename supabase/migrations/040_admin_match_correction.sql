-- Admin : repasser un match en « à venir », corriger un résultat après clôture
-- (annule les gains, remet les paris en attente, puis peut re-clôturer).

-- -----------------------------------------------------------------------------
-- admin_update_match : respecte un statut explicite (ex. scheduled depuis live)
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
  p_venue text default null,
  p_is_golden boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.matches%rowtype;
  v_home integer;
  v_away integer;
  v_status public.match_status;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_row from public.matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  if p_is_golden is true then
    update public.matches set is_golden = false where is_golden and id <> p_match_id;
  end if;

  v_home := coalesce(p_home_score, v_row.home_score);
  v_away := coalesce(p_away_score, v_row.away_score);
  v_status := coalesce(p_status, v_row.status);

  if p_status = 'scheduled' then
    v_status := 'scheduled';
  elsif v_home is not null
    and v_away is not null
    and p_status is distinct from 'scheduled'
    and p_status is distinct from 'postponed'
    and p_status is distinct from 'cancelled'
    and v_status not in ('finished', 'cancelled', 'postponed', 'scheduled')
  then
    v_status := 'live';
  end if;

  update public.matches
  set
    status = v_status,
    home_score = v_home,
    away_score = v_away,
    odd_home = coalesce(p_odd_home, odd_home),
    odd_draw = coalesce(p_odd_draw, odd_draw),
    odd_away = coalesce(p_odd_away, odd_away),
    round = coalesce(p_round, round),
    venue = coalesce(p_venue, venue),
    is_golden = case
      when p_is_golden is null then is_golden
      else p_is_golden
    end
  where id = p_match_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- reopen_match_settlement : annule clôture classique (1N2 + score exact)
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
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

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

  update public.matches
  set
    status = v_status,
    settled_at = null
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
    'status', v_status
  );
end;
$$;

grant execute on function public.reopen_match_settlement(integer, public.match_status) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_resettle_match : annule puis re-clôture avec le score actuel
-- -----------------------------------------------------------------------------
create or replace function public.admin_resettle_match(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reopen jsonb;
  v_settle jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  v_reopen := public.reopen_match_settlement(p_match_id, 'live');

  v_settle := public.settle_match(p_match_id);

  return v_reopen || v_settle || jsonb_build_object('resettled', true);
end;
$$;

grant execute on function public.admin_resettle_match(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_correct_match_result : MAJ score/statut + recalcul si déjà clôturé
-- -----------------------------------------------------------------------------
create or replace function public.admin_correct_match_result(
  p_match_id integer,
  p_home_score integer,
  p_away_score integer,
  p_status public.match_status default null,
  p_odd_home numeric default null,
  p_odd_draw numeric default null,
  p_odd_away numeric default null,
  p_is_golden boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_needs_resettle boolean;
  v_reopen jsonb;
  v_settle jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_home_score is null or p_away_score is null then
    raise exception 'Final score required';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  v_needs_resettle := v_match.status = 'finished'
    or v_match.settled_at is not null
    or exists (
      select 1
      from public.bets b
      where b.match_id = p_match_id
        and b.bet_type in ('match_result', 'exact_score')
        and b.status in ('won', 'lost')
    );

  if v_needs_resettle then
    v_reopen := public.reopen_match_settlement(p_match_id, null);
  end if;

  perform public.admin_update_match(
    p_match_id,
    p_status,
    p_home_score,
    p_away_score,
    p_odd_home,
    p_odd_draw,
    p_odd_away,
    null,
    null,
    p_is_golden
  );

  if v_needs_resettle then
    v_settle := public.settle_match(p_match_id);
    return coalesce(v_reopen, '{}'::jsonb)
      || coalesce(v_settle, '{}'::jsonb)
      || jsonb_build_object('corrected', true);
  end if;

  return jsonb_build_object(
    'match_id', p_match_id,
    'corrected', false,
    'updated', true
  );
end;
$$;

grant execute on function public.admin_correct_match_result(
  integer,
  integer,
  integer,
  public.match_status,
  numeric,
  numeric,
  numeric,
  boolean
) to authenticated;

notify pgrst, 'reload schema';
