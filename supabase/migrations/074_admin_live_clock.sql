-- Chrono live recalibrable par l'admin (retards, décalages API).

alter table public.matches
  add column if not exists live_clock_anchor_at timestamptz,
  add column if not exists live_clock_manual boolean not null default false;

comment on column public.matches.live_clock_anchor_at is
  'Instant de référence pour le chrono manuel (minute admin + temps écoulé).';
comment on column public.matches.live_clock_manual is
  'true = ne pas écraser le chrono via football-data.org.';

create or replace function public.admin_set_live_clock(
  p_match_id integer,
  p_live_minute integer default null,
  p_live_injury_time integer default null,
  p_live_clock_anchor_at timestamptz default null,
  p_reset boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.matches%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_row from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  if coalesce(p_reset, false) then
    update public.matches
    set
      live_clock_manual = false,
      live_clock_anchor_at = null,
      live_minute = null,
      live_injury_time = null,
      updated_at = now()
    where id = p_match_id;
    return;
  end if;

  if p_live_minute is not null and p_live_minute < 0 then
    raise exception 'Minute invalide';
  end if;

  if p_live_injury_time is not null and p_live_injury_time < 0 then
    raise exception 'Temps additionnel invalide';
  end if;

  if p_live_minute is null and p_live_clock_anchor_at is null then
    raise exception 'Minute ou coup d''envoi effectif requis';
  end if;

  update public.matches
  set
    live_clock_manual = true,
    live_clock_anchor_at = coalesce(p_live_clock_anchor_at, now()),
    live_minute = p_live_minute,
    live_injury_time = p_live_injury_time,
    status = case
      when status in ('scheduled', 'postponed') then 'live'::public.match_status
      else status
    end,
    suppress_auto_live = false,
    updated_at = now()
  where id = p_match_id;
end;
$$;

grant execute on function public.admin_set_live_clock(integer, integer, integer, timestamptz, boolean)
  to authenticated;

-- Repasser en « à venir » efface aussi le chrono manuel.
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
    suppress_auto_live = v_suppress_auto_live,
    ai_summary = case when v_status = 'scheduled' then null else ai_summary end,
    live_minute = case when p_status = 'scheduled' then null else live_minute end,
    live_injury_time = case when p_status = 'scheduled' then null else live_injury_time end,
    live_clock_anchor_at = case when p_status = 'scheduled' then null else live_clock_anchor_at end,
    live_clock_manual = case when p_status = 'scheduled' then false else live_clock_manual end
  where id = p_match_id;
end;
$$;

notify pgrst, 'reload schema';
