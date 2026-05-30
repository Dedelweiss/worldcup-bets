-- Corrige la typo p_away → p_odd_away dans admin_create_match

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
    p_odd_home, p_odd_draw, p_odd_away,
    auth.uid()
  );

  return v_match_id;
end;
$$;

grant execute on function public.admin_create_match to authenticated;

notify pgrst, 'reload schema';
