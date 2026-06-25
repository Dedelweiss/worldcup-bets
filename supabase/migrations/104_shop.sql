-- Boutique : packs multi-monnaie, marché du jour, idempotency achats.

alter type public.transaction_type add value if not exists 'shop_market_purchase';

alter table public.pack_types
  add column if not exists price_currency text not null default 'pack_coins'
    check (price_currency in ('pack_coins', 'card_shards')),
  add column if not exists description text,
  add column if not exists sort_order smallint not null default 0;

-- -----------------------------------------------------------------------------
-- Marché du jour
-- -----------------------------------------------------------------------------

create table if not exists public.shop_daily_rotations (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.card_sets (id) on delete cascade,
  rotation_date date not null,
  created_at timestamptz not null default now(),
  unique (set_id, rotation_date)
);

create table if not exists public.shop_daily_listings (
  id uuid primary key default gen_random_uuid(),
  rotation_id uuid not null references public.shop_daily_rotations (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  slot_index smallint not null check (slot_index between 1 and 5),
  price_amount integer not null check (price_amount > 0),
  price_currency text not null check (price_currency in ('pack_coins', 'card_shards')),
  unique (rotation_id, slot_index),
  unique (rotation_id, card_id)
);

create table if not exists public.shop_daily_purchases (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.shop_daily_listings (id) on delete cascade,
  purchased_at timestamptz not null default now(),
  price_paid integer not null,
  price_currency text not null,
  shards_gained integer not null default 0,
  primary key (user_id, listing_id)
);

create index if not exists shop_daily_purchases_user_idx
  on public.shop_daily_purchases (user_id, purchased_at desc);

create table if not exists public.shop_purchase_idempotency (
  idempotency_key uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('pack', 'market')),
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists shop_idempotency_user_idx
  on public.shop_purchase_idempotency (user_id, created_at desc);

alter table public.shop_daily_rotations enable row level security;
alter table public.shop_daily_listings enable row level security;
alter table public.shop_daily_purchases enable row level security;
alter table public.shop_purchase_idempotency enable row level security;

create policy shop_rotations_read on public.shop_daily_rotations
  for select to authenticated using (true);

create policy shop_listings_read on public.shop_daily_listings
  for select to authenticated using (true);

create policy shop_purchases_own on public.shop_daily_purchases
  for select to authenticated using (user_id = auth.uid());

create policy shop_idempotency_own on public.shop_purchase_idempotency
  for select to authenticated using (user_id = auth.uid());

-- Prix marché selon rareté et monnaie.
create or replace function public.shop_market_price(
  p_rarity public.card_rarity,
  p_currency text
) returns integer
language sql
immutable
as $$
  select case p_currency
    when 'pack_coins' then case p_rarity
      when 'commune' then 80
      when 'rare' then 200
      when 'epique' then 450
      when 'legendaire' then 1200
    end
    when 'card_shards' then case p_rarity
      when 'commune' then 40
      when 'rare' then 120
      when 'epique' then 350
      when 'legendaire' then 900
    end
  end;
$$;

create or replace function public.shop_market_currency(p_rarity public.card_rarity)
returns text
language sql
immutable
as $$
  select case
    when p_rarity in ('epique', 'legendaire') then 'card_shards'
    else 'pack_coins'
  end;
$$;

-- Crée la rotation du jour si absente (déterministe, identique pour tous).
create or replace function public.ensure_daily_shop_rotation(p_set_code text default 'wc2026')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_set_id uuid;
  v_rotation_id uuid;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_seed text;
  v_card record;
  v_idx smallint := 0;
  v_has_rare_plus boolean := false;
begin
  select id into v_set_id from public.card_sets where code = p_set_code;
  if v_set_id is null then
    raise exception 'Set not found';
  end if;

  select id into v_rotation_id
  from public.shop_daily_rotations
  where set_id = v_set_id and rotation_date = v_today;

  if found then
    return v_rotation_id;
  end if;

  v_seed := v_today::text || ':' || p_set_code;

  insert into public.shop_daily_rotations (set_id, rotation_date)
  values (v_set_id, v_today)
  returning id into v_rotation_id;

  for v_card in
    select c.id, c.rarity
    from public.cards c
    where c.set_id = v_set_id
      and c.category = 'joueur'
      and c.is_active = true
      and trim(coalesce(c.name, '')) <> ''
    order by md5(v_seed || c.code)
    limit 4
  loop
    v_idx := v_idx + 1;
    if v_card.rarity in ('rare', 'epique', 'legendaire') then
      v_has_rare_plus := true;
    end if;

    insert into public.shop_daily_listings (
      rotation_id, card_id, slot_index, price_amount, price_currency
    )
    values (
      v_rotation_id,
      v_card.id,
      v_idx,
      public.shop_market_price(v_card.rarity, public.shop_market_currency(v_card.rarity)),
      public.shop_market_currency(v_card.rarity)
    );
  end loop;

  -- Garantir au moins une carte Rare+ dans le marché.
  if not v_has_rare_plus and v_idx > 0 then
    update public.shop_daily_listings l
    set
      card_id = sub.id,
      price_amount = public.shop_market_price(sub.rarity, public.shop_market_currency(sub.rarity)),
      price_currency = public.shop_market_currency(sub.rarity)
    from (
      select c.id, c.rarity
      from public.cards c
      where c.set_id = v_set_id
        and c.category = 'joueur'
        and c.is_active = true
        and c.rarity in ('rare', 'epique', 'legendaire')
        and trim(coalesce(c.name, '')) <> ''
        and not exists (
          select 1 from public.shop_daily_listings l2
          where l2.rotation_id = v_rotation_id and l2.card_id = c.id
        )
      order by md5(v_seed || ':rare:' || c.code)
      limit 1
    ) sub
    where l.rotation_id = v_rotation_id and l.slot_index = 1;
  end if;

  return v_rotation_id;
end;
$$;

-- Marché du jour pour l'utilisateur courant.
create or replace function public.get_daily_shop(p_set_code text default 'wc2026')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rotation_id uuid;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_expires timestamptz;
  v_listings jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_rotation_id := public.ensure_daily_shop_rotation(p_set_code);
  v_expires := ((v_today + 1)::timestamp at time zone 'Europe/Paris');

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'listing_id', l.id,
      'slot_index', l.slot_index,
      'card_id', c.id,
      'code', c.code,
      'name', c.name,
      'rarity', c.rarity,
      'category', c.category,
      'country_code', c.country_code,
      'position', c.position,
      'stats', c.stats,
      'image_path', c.image_path,
      'price_amount', l.price_amount,
      'price_currency', l.price_currency,
      'purchased', exists (
        select 1 from public.shop_daily_purchases p
        where p.user_id = v_user_id and p.listing_id = l.id
      ),
      'owned', exists (
        select 1 from public.user_cards uc
        where uc.user_id = v_user_id and uc.card_id = c.id
      )
    )
    order by l.slot_index
  ), '[]'::jsonb)
  into v_listings
  from public.shop_daily_listings l
  inner join public.cards c on c.id = l.card_id
  where l.rotation_id = v_rotation_id;

  return jsonb_build_object(
    'rotation_date', v_today,
    'expires_at', v_expires,
    'listings', v_listings
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- buy_pack : jetons OU éclats + idempotency
-- -----------------------------------------------------------------------------
drop function if exists public.buy_pack(uuid);

create or replace function public.buy_pack(
  p_pack_type_id uuid,
  p_idempotency_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pack public.pack_types%rowtype;
  v_coins numeric;
  v_shards integer;
  v_pack_id uuid;
  v_cached jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_idempotency_key is not null then
    select result into v_cached
    from public.shop_purchase_idempotency
    where idempotency_key = p_idempotency_key
      and user_id = v_user_id
      and kind = 'pack';

    if found then
      return (v_cached ->> 'pack_id')::uuid;
    end if;
  end if;

  select * into v_pack from public.pack_types where id = p_pack_type_id;
  if not found or not v_pack.is_active then
    raise exception 'Pack unavailable';
  end if;

  select pack_coins, card_shards
  into v_coins, v_shards
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_pack.price_currency = 'pack_coins' then
    if v_coins < v_pack.price_points then
      raise exception 'Not enough coins';
    end if;
    update public.profiles
    set pack_coins = pack_coins - v_pack.price_points
    where id = v_user_id;

    insert into public.transactions (user_id, type, amount, balance_after, metadata)
    values (
      v_user_id,
      'pack_purchase',
      -v_pack.price_points,
      v_coins - v_pack.price_points,
      jsonb_build_object(
        'unit', 'pack_coins',
        'pack_type_id', p_pack_type_id,
        'pack_code', v_pack.code
      )
    );
  else
    if v_shards < v_pack.price_points then
      raise exception 'Not enough shards';
    end if;
    update public.profiles
    set card_shards = card_shards - v_pack.price_points
    where id = v_user_id;

    insert into public.transactions (user_id, type, amount, balance_after, metadata)
    values (
      v_user_id,
      'shop_market_purchase',
      -v_pack.price_points,
      v_shards - v_pack.price_points,
      jsonb_build_object(
        'unit', 'card_shards',
        'kind', 'pack_purchase',
        'pack_type_id', p_pack_type_id,
        'pack_code', v_pack.code
      )
    );
  end if;

  insert into public.user_packs (user_id, pack_type_id, source)
  values (v_user_id, p_pack_type_id, 'purchase')
  returning id into v_pack_id;

  if p_idempotency_key is not null then
    insert into public.shop_purchase_idempotency (idempotency_key, user_id, kind, result)
    values (
      p_idempotency_key,
      v_user_id,
      'pack',
      jsonb_build_object('pack_id', v_pack_id)
    )
    on conflict (idempotency_key) do nothing;
  end if;

  return v_pack_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- buy_daily_market_card
-- -----------------------------------------------------------------------------
create or replace function public.buy_daily_market_card(
  p_listing_id uuid,
  p_idempotency_key uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_rotation_id uuid;
  v_listing public.shop_daily_listings%rowtype;
  v_card public.cards%rowtype;
  v_coins numeric;
  v_shards integer;
  v_qty integer;
  v_shards_gained integer := 0;
  v_cached jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_idempotency_key is not null then
    select result into v_cached
    from public.shop_purchase_idempotency
    where idempotency_key = p_idempotency_key
      and user_id = v_user_id
      and kind = 'market';

    if found then
      return v_cached;
    end if;
  end if;

  v_rotation_id := public.ensure_daily_shop_rotation('wc2026');

  select * into v_listing
  from public.shop_daily_listings
  where id = p_listing_id and rotation_id = v_rotation_id
  for update;

  if not found then
    raise exception 'Listing unavailable';
  end if;

  if exists (
    select 1 from public.shop_daily_purchases
    where user_id = v_user_id and listing_id = p_listing_id
  ) then
    raise exception 'Already purchased';
  end if;

  select * into v_card
  from public.cards
  where id = v_listing.card_id
    and is_active = true
    and trim(coalesce(name, '')) <> '';

  if not found then
    raise exception 'Card unavailable';
  end if;

  select pack_coins, card_shards
  into v_coins, v_shards
  from public.profiles
  where id = v_user_id
  for update;

  if v_listing.price_currency = 'pack_coins' then
    if v_coins < v_listing.price_amount then
      raise exception 'Not enough coins';
    end if;
    update public.profiles
    set pack_coins = pack_coins - v_listing.price_amount
    where id = v_user_id;
  else
    if v_shards < v_listing.price_amount then
      raise exception 'Not enough shards';
    end if;
    update public.profiles
    set card_shards = card_shards - v_listing.price_amount
    where id = v_user_id;
  end if;

  insert into public.user_cards (user_id, card_id, quantity, first_obtained_at)
  values (v_user_id, v_card.id, 1, now())
  on conflict (user_id, card_id)
    do update set quantity = user_cards.quantity + 1
  returning quantity into v_qty;

  if v_qty > 1 then
    v_shards_gained := public.shard_value(v_card.rarity);
    update public.profiles
    set card_shards = card_shards + v_shards_gained
    where id = v_user_id;
  end if;

  insert into public.shop_daily_purchases (
    user_id, listing_id, price_paid, price_currency, shards_gained
  )
  values (
    v_user_id,
    p_listing_id,
    v_listing.price_amount,
    v_listing.price_currency,
    v_shards_gained
  );

  insert into public.transactions (user_id, type, amount, balance_after, metadata)
  values (
    v_user_id,
    'shop_market_purchase',
    -v_listing.price_amount,
    case
      when v_listing.price_currency = 'pack_coins'
        then v_coins - v_listing.price_amount
      else v_shards - v_listing.price_amount + v_shards_gained
    end,
    jsonb_build_object(
      'unit', v_listing.price_currency,
      'listing_id', p_listing_id,
      'card_id', v_card.id,
      'card_code', v_card.code,
      'duplicate_shards', v_shards_gained
    )
  );

  v_cached := jsonb_build_object(
    'card_id', v_card.id,
    'code', v_card.code,
    'name', v_card.name,
    'rarity', v_card.rarity,
    'duplicate', v_qty > 1,
    'shards_gained', v_shards_gained
  );

  if p_idempotency_key is not null then
    insert into public.shop_purchase_idempotency (idempotency_key, user_id, kind, result)
    values (p_idempotency_key, v_user_id, 'market', v_cached)
    on conflict (idempotency_key) do nothing;
  end if;

  return v_cached;
end;
$$;

grant execute on function public.shop_market_price(public.card_rarity, text) to authenticated;
grant execute on function public.ensure_daily_shop_rotation(text) to authenticated;
grant execute on function public.get_daily_shop(text) to authenticated;
grant execute on function public.buy_daily_market_card(uuid, uuid) to authenticated;
grant execute on function public.buy_pack(uuid, uuid) to authenticated;

-- Pack Premium (éclats) + métadonnées Standard
update public.pack_types
set
  sort_order = 0,
  description = '5 cartes · garantie Rare minimum'
where code = 'standard';

insert into public.pack_types (
  code, name, set_id, price_points, price_currency, card_count, weights,
  guaranteed_min_rarity, sort_order, description
)
select
  'premium',
  'Pack Premium',
  s.id,
  500,
  'card_shards',
  5,
  '{"commune":40,"rare":35,"epique":20,"legendaire":5}'::jsonb,
  'epique',
  1,
  '5 cartes · garantie Épique minimum · meilleures chances Légendaire'
from public.card_sets s
where s.code = 'wc2026'
on conflict (code) do update set
  name = excluded.name,
  price_points = excluded.price_points,
  price_currency = excluded.price_currency,
  card_count = excluded.card_count,
  weights = excluded.weights,
  guaranteed_min_rarity = excluded.guaranteed_min_rarity,
  sort_order = excluded.sort_order,
  description = excluded.description,
  is_active = true;

notify pgrst, 'reload schema';
