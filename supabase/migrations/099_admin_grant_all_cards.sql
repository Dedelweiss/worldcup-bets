-- Donne toutes les cartes du catalogue à un joueur (test admin).

create or replace function public.admin_grant_all_cards(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_granted integer;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_user_id is null then
    raise exception 'User required';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Profile not found';
  end if;

  insert into public.user_cards (user_id, card_id, quantity)
  select p_user_id, c.id, 1
  from public.cards c
  where not exists (
    select 1
    from public.user_cards uc
    where uc.user_id = p_user_id and uc.card_id = c.id
  );

  get diagnostics v_granted = row_count;
  return v_granted;
end;
$$;

grant execute on function public.admin_grant_all_cards(uuid) to authenticated;

notify pgrst, 'reload schema';
