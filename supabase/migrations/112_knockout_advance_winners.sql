-- Propagation automatique des vainqueurs/perdants en phase finale (M73–M104).

create or replace function public.knockout_fifa_no(p_match_id integer)
returns integer
language sql
immutable
as $$
  select case
    when p_match_id between 2026073 and 2026104 then p_match_id - 2026000
    else null
  end;
$$;

create or replace function public.knockout_outcome_team_id(
  p_match_id integer,
  p_outcome text
)
returns integer
language plpgsql
stable
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
begin
  select * into v_match from public.matches where id = p_match_id;
  if not found or v_match.home_score is null or v_match.away_score is null then
    return null;
  end if;
  if v_match.home_score = v_match.away_score then
    return null;
  end if;

  if p_outcome = 'winner' then
    if v_match.home_score > v_match.away_score then
      return v_match.home_team_id;
    else
      return v_match.away_team_id;
    end if;
  elsif p_outcome = 'loser' then
    if v_match.home_score > v_match.away_score then
      return v_match.away_team_id;
    else
      return v_match.home_team_id;
    end if;
  end if;

  return null;
end;
$$;

create or replace function public.propagate_knockout_advancement(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fifa integer;
  v_team_id integer;
  v_updated integer := 0;
  r record;
begin
  v_fifa := public.knockout_fifa_no(p_match_id);
  if v_fifa is null then
    return jsonb_build_object('skipped', true, 'reason', 'not_knockout');
  end if;

  for r in
    select *
    from (
      values
        (2026089, 'home', 'winner', 74),
        (2026089, 'away', 'winner', 77),
        (2026090, 'home', 'winner', 73),
        (2026090, 'away', 'winner', 75),
        (2026091, 'home', 'winner', 76),
        (2026091, 'away', 'winner', 78),
        (2026092, 'home', 'winner', 79),
        (2026092, 'away', 'winner', 80),
        (2026093, 'home', 'winner', 83),
        (2026093, 'away', 'winner', 84),
        (2026094, 'home', 'winner', 81),
        (2026094, 'away', 'winner', 82),
        (2026095, 'home', 'winner', 86),
        (2026095, 'away', 'winner', 88),
        (2026096, 'home', 'winner', 85),
        (2026096, 'away', 'winner', 87),
        (2026097, 'home', 'winner', 89),
        (2026097, 'away', 'winner', 90),
        (2026098, 'home', 'winner', 93),
        (2026098, 'away', 'winner', 94),
        (2026099, 'home', 'winner', 91),
        (2026099, 'away', 'winner', 92),
        (2026100, 'home', 'winner', 95),
        (2026100, 'away', 'winner', 96),
        (2026101, 'home', 'winner', 97),
        (2026101, 'away', 'winner', 98),
        (2026102, 'home', 'winner', 99),
        (2026102, 'away', 'winner', 100),
        (2026103, 'home', 'loser', 101),
        (2026103, 'away', 'loser', 102),
        (2026104, 'home', 'winner', 101),
        (2026104, 'away', 'winner', 102)
    ) as f(child_id, slot, outcome, source_fifa)
    where source_fifa = v_fifa
  loop
    v_team_id := public.knockout_outcome_team_id(2026000 + r.source_fifa, r.outcome);
    if v_team_id is null then
      continue;
    end if;

    if r.slot = 'home' then
      update public.matches
      set home_team_id = v_team_id, updated_at = now()
      where id = r.child_id and home_team_id is distinct from v_team_id;
    else
      update public.matches
      set away_team_id = v_team_id, updated_at = now()
      where id = r.child_id and away_team_id is distinct from v_team_id;
    end if;

    if found then
      v_updated := v_updated + 1;
    end if;
  end loop;

  return jsonb_build_object('updated', v_updated, 'fifa', v_fifa);
end;
$$;

create or replace function public.reset_knockout_advancement(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fifa integer;
  v_updated integer := 0;
  r record;
begin
  v_fifa := public.knockout_fifa_no(p_match_id);
  if v_fifa is null then
    return jsonb_build_object('skipped', true, 'reason', 'not_knockout');
  end if;

  for r in
    select *
    from (
      values
        (2026089, 'home', 74),
        (2026089, 'away', 77),
        (2026090, 'home', 73),
        (2026090, 'away', 75),
        (2026091, 'home', 76),
        (2026091, 'away', 78),
        (2026092, 'home', 79),
        (2026092, 'away', 80),
        (2026093, 'home', 83),
        (2026093, 'away', 84),
        (2026094, 'home', 81),
        (2026094, 'away', 82),
        (2026095, 'home', 86),
        (2026095, 'away', 88),
        (2026096, 'home', 85),
        (2026096, 'away', 87),
        (2026097, 'home', 89),
        (2026097, 'away', 90),
        (2026098, 'home', 93),
        (2026098, 'away', 94),
        (2026099, 'home', 91),
        (2026099, 'away', 92),
        (2026100, 'home', 95),
        (2026100, 'away', 96),
        (2026101, 'home', 97),
        (2026101, 'away', 98),
        (2026102, 'home', 99),
        (2026102, 'away', 100),
        (2026103, 'home', 101),
        (2026103, 'away', 102),
        (2026104, 'home', 101),
        (2026104, 'away', 102)
    ) as f(child_id, slot, source_fifa)
    where source_fifa = v_fifa
  loop
    if r.slot = 'home' then
      update public.matches
      set home_team_id = 9001, updated_at = now()
      where id = r.child_id;
    else
      update public.matches
      set away_team_id = 9002, updated_at = now()
      where id = r.child_id;
    end if;
    v_updated := v_updated + 1;
  end loop;

  return jsonb_build_object('reset', v_updated, 'fifa', v_fifa);
end;
$$;

create or replace function public.trg_knockout_advancement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.settled_at is not null
     and old.settled_at is null
     and new.stage <> 'group'
     and new.home_score is not null
     and new.away_score is not null
     and new.home_score <> new.away_score then
    perform public.propagate_knockout_advancement(new.id);
  end if;

  if old.settled_at is not null and new.settled_at is null and old.stage <> 'group' then
    perform public.reset_knockout_advancement(old.id);
  end if;

  return new;
end;
$$;

drop trigger if exists knockout_advancement_on_settle on public.matches;
create trigger knockout_advancement_on_settle
  after update of settled_at on public.matches
  for each row
  execute function public.trg_knockout_advancement();

revoke all on function public.knockout_fifa_no(integer) from public;
revoke all on function public.knockout_outcome_team_id(integer, text) from public;
revoke all on function public.propagate_knockout_advancement(integer) from public;
revoke all on function public.reset_knockout_advancement(integer) from public;

grant execute on function public.propagate_knockout_advancement(integer) to service_role;
grant execute on function public.reset_knockout_advancement(integer) to service_role;

notify pgrst, 'reload schema';
