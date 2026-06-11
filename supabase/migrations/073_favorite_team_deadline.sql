-- Fermeture du choix d'équipe favorite au coup d'envoi du premier match.

create or replace function public.is_favorite_team_selection_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    select min(m.kickoff_at)
    from public.matches m
    where m.status not in ('cancelled', 'postponed')
  ) is null
  or now() < (
    select min(m.kickoff_at)
    from public.matches m
    where m.status not in ('cancelled', 'postponed')
  );
$$;

comment on function public.is_favorite_team_selection_open() is
  'Vrai tant qu''aucun match du tournoi n''a commencé (kickoff passé).';

grant execute on function public.is_favorite_team_selection_open() to authenticated;
grant execute on function public.is_favorite_team_selection_open() to anon;

create or replace function public.set_favorite_team(p_team_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_favorite_team_selection_open() then
    raise exception 'Favorite team selection closed';
  end if;

  if not exists (
    select 1 from public.teams
    where id = p_team_id and tournament_group_id is not null
  ) then
    raise exception 'Invalid tournament team';
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_user_id and favorite_team_id is not null
  ) then
    raise exception 'Favorite team already chosen';
  end if;

  update public.profiles
  set
    favorite_team_id = p_team_id,
    favorite_team_chosen_at = now()
  where id = v_user_id;
end;
$$;

grant execute on function public.set_favorite_team(integer) to authenticated;

notify pgrst, 'reload schema';
