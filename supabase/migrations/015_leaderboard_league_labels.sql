-- Libellés de ligues par joueur pour le classement (lecture autorisée entre pairs)

create or replace function public.get_users_league_labels(p_user_ids uuid[])
returns table (
  user_id uuid,
  league_id uuid,
  league_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select lm.user_id, l.id as league_id, l.name as league_name
  from public.league_members lm
  inner join public.leagues l on l.id = lm.league_id
  where lm.user_id = any(p_user_ids)
  order by l.name;
$$;

grant execute on function public.get_users_league_labels(uuid[]) to authenticated;

notify pgrst, 'reload schema';
