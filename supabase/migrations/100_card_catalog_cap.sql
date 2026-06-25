-- Plafond catalogue 1000 cartes actives, désactivation des nations redondantes,
-- tirage packs sur cartes actives uniquement, poids Légendaire ~1%.

alter table public.cards
  add column if not exists is_active boolean not null default true;

create index if not exists cards_active_set_idx
  on public.cards (set_id, is_active)
  where is_active = true;

-- Nations du seed initial : redondantes avec les cartes joueurs (drapeau sur chaque joueur).
update public.cards
set is_active = false
where category = 'nation' or position = 'Nation';

-- Cartes fantômes : nom vide ou joueur sans rattachement valide.
update public.cards
set is_active = false
where trim(coalesce(name, '')) = ''
   or (category = 'joueur' and team_id is null and code like 'player-%');

-- Poids pack : ~1% Légendaire par slot.
update public.pack_types
set weights = '{"commune":72,"rare":23,"epique":4,"legendaire":1}'::jsonb
where code = 'standard';

-- Compte les cartes actives d'un set.
create or replace function public.active_card_count(p_set_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from public.cards
  where set_id = p_set_id and is_active = true;
$$;

-- Bloque toute insertion qui dépasserait 1000 cartes actives par set.
create or replace function public.enforce_card_catalog_cap()
returns trigger
language plpgsql
as $$
declare
  v_count integer;
  v_active boolean;
begin
  v_active := coalesce(new.is_active, true);

  if tg_op = 'UPDATE' and old.is_active = true and v_active = false then
    return new;
  end if;

  if not v_active then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.is_active = false and v_active = true then
    select public.active_card_count(new.set_id) + 1 into v_count;
  elsif tg_op = 'INSERT' then
    select public.active_card_count(new.set_id) + 1 into v_count;
  else
    return new;
  end if;

  if v_count > 1000 then
    raise exception 'Catalog cap exceeded: max 1000 active cards per set (attempted %)', v_count;
  end if;

  return new;
end;
$$;

drop trigger if exists cards_catalog_cap on public.cards;
create trigger cards_catalog_cap
  before insert or update of is_active on public.cards
  for each row
  execute function public.enforce_card_catalog_cap();

-- open_pack : cartes actives + métadonnées complètes pour l'affichage.
create or replace function public.open_pack(p_pack_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pack public.user_packs%rowtype;
  v_type public.pack_types%rowtype;
  v_pity_threshold constant integer := 30;
  v_pity integer;
  v_force_legendary boolean;
  v_got_legendary boolean := false;
  v_max_rarity public.card_rarity := 'commune';
  v_rarity public.card_rarity;
  v_card public.cards%rowtype;
  v_qty integer;
  v_shards integer := 0;
  v_cards jsonb := '[]'::jsonb;
  v_opening_id uuid;
  i integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_pack_id is not null then
    select * into v_pack from public.user_packs
    where id = p_pack_id and user_id = v_user_id
    for update skip locked;
  else
    select * into v_pack from public.user_packs
    where user_id = v_user_id
    order by created_at
    limit 1
    for update skip locked;
  end if;

  if not found then
    raise exception 'No pack to open';
  end if;

  select * into v_type from public.pack_types where id = v_pack.pack_type_id;
  if not found then
    raise exception 'Pack type not found';
  end if;

  if not exists (
    select 1 from public.cards
    where set_id = v_type.set_id and is_active = true
  ) then
    raise exception 'No cards available for this set';
  end if;

  select packs_since_legendary into v_pity from public.profiles where id = v_user_id for update;
  v_force_legendary := coalesce(v_pity, 0) >= v_pity_threshold;

  for i in 1 .. v_type.card_count loop
    if i = 1 and v_force_legendary then
      v_rarity := 'legendaire';
    else
      v_rarity := public.pick_rarity(v_type.weights);
    end if;

    if i = v_type.card_count
       and v_max_rarity < v_type.guaranteed_min_rarity
       and v_rarity < v_type.guaranteed_min_rarity then
      v_rarity := v_type.guaranteed_min_rarity;
    end if;

    select * into v_card
    from public.cards
    where set_id = v_type.set_id
      and rarity = v_rarity
      and is_active = true
      and trim(coalesce(name, '')) <> ''
    order by random()
    limit 1;

    if not found then
      select * into v_card
      from public.cards
      where set_id = v_type.set_id
        and is_active = true
        and trim(coalesce(name, '')) <> ''
      order by random()
      limit 1;
    end if;

    if not found then
      raise exception 'No valid card to draw';
    end if;

    if v_card.rarity > v_max_rarity then
      v_max_rarity := v_card.rarity;
    end if;
    if v_card.rarity = 'legendaire' then
      v_got_legendary := true;
    end if;

    insert into public.user_cards (user_id, card_id, quantity, first_obtained_at)
    values (v_user_id, v_card.id, 1, now())
    on conflict (user_id, card_id)
      do update set quantity = user_cards.quantity + 1
    returning quantity into v_qty;

    if v_qty > 1 then
      v_shards := v_shards + public.shard_value(v_card.rarity);
    end if;

    v_cards := v_cards || jsonb_build_object(
      'card_id', v_card.id,
      'code', v_card.code,
      'name', v_card.name,
      'rarity', v_card.rarity,
      'category', v_card.category,
      'country_code', v_card.country_code,
      'position', v_card.position,
      'stats', v_card.stats,
      'image_path', v_card.image_path,
      'duplicate', v_qty > 1
    );
  end loop;

  if v_got_legendary then
    update public.profiles set packs_since_legendary = 0 where id = v_user_id;
  else
    update public.profiles set packs_since_legendary = packs_since_legendary + 1 where id = v_user_id;
  end if;

  if v_shards > 0 then
    update public.profiles set card_shards = card_shards + v_shards where id = v_user_id;
  end if;

  delete from public.user_packs where id = v_pack.id;

  insert into public.pack_openings (user_id, pack_type_id, source, result, shards_gained)
  values (
    v_user_id,
    v_pack.pack_type_id,
    v_pack.source,
    jsonb_build_object('cards', v_cards),
    v_shards
  )
  returning id into v_opening_id;

  return jsonb_build_object(
    'opening_id', v_opening_id,
    'cards', v_cards,
    'shards_gained', v_shards
  );
end;
$$;

-- Donne toutes les cartes actives du catalogue.
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
  where c.is_active = true
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

notify pgrst, 'reload schema';
