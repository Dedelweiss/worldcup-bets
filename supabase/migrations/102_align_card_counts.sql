-- Aligne possessions et compteurs : seules les cartes actives du catalogue comptent.

-- Supprime les possessions liées à des cartes hors catalogue actif.
create or replace function public.prune_inactive_user_cards(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removed integer;
begin
  if p_user_id is not null and not public.is_admin() and p_user_id <> auth.uid() then
    raise exception 'Forbidden';
  end if;

  delete from public.user_cards uc
  using public.cards c
  where uc.card_id = c.id
    and (c.is_active = false or trim(coalesce(c.name, '')) = '')
    and (p_user_id is null or uc.user_id = p_user_id);

  get diagnostics v_removed = row_count;
  return v_removed;
end;
$$;

grant execute on function public.prune_inactive_user_cards(uuid) to authenticated;

-- Donne toutes les cartes actives du catalogue à un joueur (test admin).
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

  perform public.prune_inactive_user_cards(p_user_id);

  insert into public.user_cards (user_id, card_id, quantity)
  select p_user_id, c.id, 1
  from public.cards c
  inner join public.card_sets s on s.id = c.set_id
  where s.code = 'wc2026'
    and c.is_active = true
    and trim(coalesce(c.name, '')) <> ''
    and not exists (
      select 1
      from public.user_cards uc
      where uc.user_id = p_user_id and uc.card_id = c.id
    );

  get diagnostics v_granted = row_count;
  return v_granted;
end;
$$;

-- Compte les cartes actives possédées (album joueur).
create or replace function public.count_user_active_cards(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.user_cards uc
  inner join public.cards c on c.id = uc.card_id
  inner join public.card_sets s on s.id = c.set_id
  where uc.user_id = p_user_id
    and c.is_active = true
    and s.code = 'wc2026'
    and trim(coalesce(c.name, '')) <> '';
$$;

grant execute on function public.count_user_active_cards(uuid) to authenticated;

notify pgrst, 'reload schema';
