-- Corrige le tirage des packs : ~92 % joueurs / ~8 % cartes spéciales par slot
-- (évite VAR sur chaque slot « rare »). Voir 110 pour autoriser les doublons dans un pack.
--    Les joueurs sont presque tous « commune » : un slot rare ne doit pas piocher uniquement
--    dans les 3 objets rares (VAR, ballon, 12e homme).

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
  v_drawn uuid[] := '{}';
  v_use_joueur boolean;
  v_needs_guarantee_pick boolean;
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

    v_needs_guarantee_pick :=
      i = v_type.card_count
      and v_max_rarity < v_type.guaranteed_min_rarity;

    v_use_joueur := random() < 0.92;

    if v_use_joueur then
      select * into v_card
      from public.cards
      where set_id = v_type.set_id
        and category = 'joueur'
        and is_active = true
        and trim(coalesce(name, '')) <> ''
        and not (id = any(v_drawn))
        and (
          case
            when v_rarity = 'legendaire' then rarity = 'legendaire'
            when v_rarity = 'epique' then rarity = 'epique'
            when v_needs_guarantee_pick then rarity >= v_type.guaranteed_min_rarity
            else rarity = 'commune'
          end
        )
      order by random()
      limit 1;
    end if;

    if not found then
      select * into v_card
      from public.cards
      where set_id = v_type.set_id
        and category <> 'joueur'
        and rarity = v_rarity
        and is_active = true
        and trim(coalesce(name, '')) <> ''
        and not (id = any(v_drawn))
      order by random()
      limit 1;
    end if;

    if not found then
      select * into v_card
      from public.cards
      where set_id = v_type.set_id
        and category = 'joueur'
        and is_active = true
        and trim(coalesce(name, '')) <> ''
        and not (id = any(v_drawn))
      order by random()
      limit 1;
    end if;

    if not found then
      select * into v_card
      from public.cards
      where set_id = v_type.set_id
        and is_active = true
        and trim(coalesce(name, '')) <> ''
        and not (id = any(v_drawn))
      order by random()
      limit 1;
    end if;

    if not found then
      raise exception 'No valid card to draw';
    end if;

    v_drawn := array_append(v_drawn, v_card.id);

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

comment on function public.open_pack(uuid) is
  'Ouvre un pack : ~92 % joueurs par slot, ~8 % spéciales (108 ; doublons autorisés via 110).';

notify pgrst, 'reload schema';
