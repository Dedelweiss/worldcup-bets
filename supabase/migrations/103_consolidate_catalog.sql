-- Catalogue WC2026 : compteur unique, consolidation à 1000 cartes valides.

create or replace function public.count_wc2026_catalog_cards()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.cards c
  inner join public.card_sets s on s.id = c.set_id
  where s.code = 'wc2026'
    and c.is_active = true
    and trim(coalesce(c.name, '')) <> '';
$$;

grant execute on function public.count_wc2026_catalog_cards() to authenticated;

-- Désactive fantômes + excédent > 1000 (ordre stable par code).
create or replace function public.admin_consolidate_wc2026_catalog()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_set_id uuid;
  v_invalid integer;
  v_excess integer;
  v_pruned integer;
  v_active integer;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select id into v_set_id from public.card_sets where code = 'wc2026';
  if v_set_id is null then
    return jsonb_build_object('error', 'Set wc2026 not found');
  end if;

  update public.cards
  set is_active = false
  where set_id = v_set_id
    and trim(coalesce(name, '')) = '';

  get diagnostics v_invalid = row_count;

  with ranked as (
    select c.id,
           row_number() over (order by c.code) as rn
    from public.cards c
    where c.set_id = v_set_id
      and c.is_active = true
      and trim(coalesce(c.name, '')) <> ''
  )
  update public.cards c
  set is_active = false
  from ranked r
  where c.id = r.id
    and r.rn > 1000;

  get diagnostics v_excess = row_count;

  v_pruned := public.prune_inactive_user_cards(null);
  v_active := public.count_wc2026_catalog_cards();

  return jsonb_build_object(
    'invalid_deactivated', v_invalid,
    'excess_deactivated', v_excess,
    'user_cards_pruned', v_pruned,
    'active_catalog', v_active
  );
end;
$$;

grant execute on function public.admin_consolidate_wc2026_catalog() to authenticated;

-- Compte possessions aligné album (cartes valides actives uniquement).
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
    and s.code = 'wc2026'
    and c.is_active = true
    and trim(coalesce(c.name, '')) <> '';
$$;

grant execute on function public.count_user_active_cards(uuid) to authenticated;

-- Retour passé de integer → jsonb : DROP obligatoire avant recréation.
drop function if exists public.admin_grant_all_cards(uuid);

-- Donne toutes les cartes valides du catalogue actif.
create or replace function public.admin_grant_all_cards(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_granted integer;
  v_catalog integer;
  v_owned integer;
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

  perform public.admin_consolidate_wc2026_catalog();
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

  v_catalog := public.count_wc2026_catalog_cards();
  v_owned := public.count_user_active_cards(p_user_id);

  return jsonb_build_object(
    'granted', v_granted,
    'catalog_total', v_catalog,
    'owned_total', v_owned
  );
end;
$$;

grant execute on function public.admin_grant_all_cards(uuid) to authenticated;

notify pgrst, 'reload schema';
