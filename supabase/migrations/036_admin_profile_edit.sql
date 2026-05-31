-- Admin : modifier le pseudo ou l'équipe favorite de n'importe quel joueur.

create or replace function public.admin_set_user_username(
  p_user_id uuid,
  p_username text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found';
  end if;

  v_normalized := lower(trim(p_username));

  if char_length(v_normalized) < 3 then
    raise exception 'Le pseudo doit contenir au moins 3 caractères';
  end if;

  if char_length(v_normalized) > 20 then
    raise exception 'Le pseudo ne peut pas dépasser 20 caractères';
  end if;

  if v_normalized !~ '^[a-z0-9_]+$' then
    raise exception 'Uniquement lettres minuscules, chiffres et underscore (_)';
  end if;

  if exists (
    select 1 from public.profiles
    where username = v_normalized and id <> p_user_id
  ) then
    raise exception 'Ce pseudo est déjà pris';
  end if;

  update public.profiles
  set username = v_normalized
  where id = p_user_id;

  return v_normalized;
end;
$$;

grant execute on function public.admin_set_user_username(uuid, text) to authenticated;

create or replace function public.admin_set_user_favorite_team(
  p_user_id uuid,
  p_team_id integer default null
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

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found';
  end if;

  if p_team_id is not null then
    if not exists (
      select 1 from public.teams
      where id = p_team_id and tournament_group_id is not null
    ) then
      raise exception 'Invalid tournament team';
    end if;

    update public.profiles
    set
      favorite_team_id = p_team_id,
      favorite_team_chosen_at = coalesce(favorite_team_chosen_at, now())
    where id = p_user_id;
  else
    update public.profiles
    set
      favorite_team_id = null,
      favorite_team_chosen_at = null
    where id = p_user_id;
  end if;
end;
$$;

grant execute on function public.admin_set_user_favorite_team(uuid, integer) to authenticated;

notify pgrst, 'reload schema';
