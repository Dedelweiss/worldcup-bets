-- admin_update_match : champs score vides = NULL en base (effacer le score)

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
  p_is_golden boolean default null,
  p_apply_scores boolean default true
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
  v_suppress_auto_live boolean;
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

  if coalesce(p_apply_scores, true) then
    v_home := p_home_score;
    v_away := p_away_score;
  else
    v_home := coalesce(p_home_score, v_row.home_score);
    v_away := coalesce(p_away_score, v_row.away_score);
  end if;

  v_status := coalesce(p_status, v_row.status);
  v_suppress_auto_live := v_row.suppress_auto_live;

  if p_status = 'scheduled' then
    v_status := 'scheduled';
    v_suppress_auto_live := true;
  elsif p_status = 'live' then
    v_suppress_auto_live := false;
  end if;

  if p_status is distinct from 'scheduled'
    and p_status is distinct from 'postponed'
    and p_status is distinct from 'cancelled'
    and v_home is not null
    and v_away is not null
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
    end,
    suppress_auto_live = v_suppress_auto_live
  where id = p_match_id;
end;
$$;

-- admin_correct_match_result appelle admin_update_match sans effacer les scores
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
    p_is_golden,
    true
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

notify pgrst, 'reload schema';
