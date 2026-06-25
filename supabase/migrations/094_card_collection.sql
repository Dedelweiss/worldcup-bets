-- Collection de cartes (style Panini) adossee a l'economie de points.
--
-- Acquisition d'un pack : (1) achat en points, (2) drop aleatoire sur prono gagnant.
-- Ouverture : tirage pondere serveur, garantie Rare+, pity timer Legendaire,
-- doublons convertis en eclats (card_shards). Aucune monnaie en argent reel.

-- -----------------------------------------------------------------------------
-- Enums & colonnes profil
-- -----------------------------------------------------------------------------

-- Raretes ordonnees (commune < rare < epique < legendaire) : l'ordre sert aux
-- comparaisons (garantie Rare+, detection Legendaire).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'card_rarity') then
    create type public.card_rarity as enum ('commune', 'rare', 'epique', 'legendaire');
  end if;
end$$;

alter type public.transaction_type add value if not exists 'pack_purchase';

alter table public.profiles
  add column if not exists card_shards integer not null default 0 check (card_shards >= 0),
  add column if not exists packs_since_legendary integer not null default 0 check (packs_since_legendary >= 0);

-- -----------------------------------------------------------------------------
-- Catalogue (statique, ultra-cachable)
-- -----------------------------------------------------------------------------
create table if not exists public.card_sets (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  season integer not null default 2026,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.card_sets (id) on delete cascade,
  code text unique not null,
  name text not null,
  rarity public.card_rarity not null,
  country_code text,            -- drapeau (libre de droits), pas de photo de joueur
  position text,
  image_path text,              -- chemin Supabase Storage (CDN + WebP a la volee)
  stats jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists cards_set_rarity_idx on public.cards (set_id, rarity);

create table if not exists public.pack_types (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  set_id uuid not null references public.card_sets (id) on delete restrict,
  price_points integer not null check (price_points >= 0),
  card_count integer not null default 5 check (card_count between 1 and 20),
  -- Poids par rarete, ex: {"commune":70,"rare":22,"epique":6,"legendaire":2}
  weights jsonb not null,
  guaranteed_min_rarity public.card_rarity not null default 'rare',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Donnees utilisateur
-- -----------------------------------------------------------------------------

-- Inventaire de packs NON ouverts (1 ligne = 1 pack). L'ouverture supprime la ligne.
create table if not exists public.user_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pack_type_id uuid not null references public.pack_types (id) on delete restrict,
  source text not null check (source in ('purchase', 'bet_drop')),
  match_id integer references public.matches (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists user_packs_user_idx on public.user_packs (user_id, created_at);

-- Cap anti-farm : au plus 1 pack droppe par match et par joueur.
create unique index if not exists user_packs_bet_drop_unique
  on public.user_packs (user_id, match_id)
  where source = 'bet_drop' and match_id is not null;

-- Collection : 1 ligne par carte possedee, doublons comptes en quantity.
create table if not exists public.user_cards (
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  quantity integer not null default 1 check (quantity >= 1),
  first_obtained_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

-- Historique des ouvertures (audit + rejouer l'animation).
create table if not exists public.pack_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pack_type_id uuid not null references public.pack_types (id) on delete restrict,
  source text not null,
  result jsonb not null,
  shards_gained integer not null default 0,
  opened_at timestamptz not null default now()
);

create index if not exists pack_openings_user_idx on public.pack_openings (user_id, opened_at desc);

-- -----------------------------------------------------------------------------
-- Helpers de tirage
-- -----------------------------------------------------------------------------

-- Valeur d'un doublon en eclats selon la rarete.
create or replace function public.shard_value(p_rarity public.card_rarity)
returns integer
language sql
immutable
as $$
  select case p_rarity
    when 'commune' then 5
    when 'rare' then 20
    when 'epique' then 80
    when 'legendaire' then 300
  end;
$$;

-- Tire une rarete selon les poids fournis (tirage pondere).
create or replace function public.pick_rarity(p_weights jsonb)
returns public.card_rarity
language plpgsql
volatile
set search_path = public
as $$
declare
  v_total numeric := 0;
  v_cum numeric := 0;
  v_roll numeric;
  v_key text;
  v_val numeric;
begin
  for v_key, v_val in select key, value::numeric from jsonb_each_text(p_weights) loop
    v_total := v_total + v_val;
  end loop;

  if v_total <= 0 then
    return 'commune';
  end if;

  v_roll := random() * v_total;

  for v_key, v_val in select key, value::numeric from jsonb_each_text(p_weights) loop
    v_cum := v_cum + v_val;
    if v_roll <= v_cum then
      return v_key::public.card_rarity;
    end if;
  end loop;

  return 'commune';
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC : acheter un pack avec des points
-- -----------------------------------------------------------------------------
create or replace function public.buy_pack(p_pack_type_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pack public.pack_types%rowtype;
  v_points numeric;
  v_pack_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_pack from public.pack_types where id = p_pack_type_id;
  if not found or not v_pack.is_active then
    raise exception 'Pack unavailable';
  end if;

  select points into v_points from public.profiles where id = v_user_id for update;
  if not found then
    raise exception 'Profile not found';
  end if;

  if v_points < v_pack.price_points then
    raise exception 'Not enough points';
  end if;

  update public.profiles
  set points = points - v_pack.price_points
  where id = v_user_id;

  insert into public.transactions (user_id, type, amount, balance_after, metadata)
  values (
    v_user_id,
    'pack_purchase',
    -v_pack.price_points,
    v_points - v_pack.price_points,
    jsonb_build_object('unit', 'points', 'pack_type_id', p_pack_type_id)
  );

  insert into public.user_packs (user_id, pack_type_id, source)
  values (v_user_id, p_pack_type_id, 'purchase')
  returning id into v_pack_id;

  return v_pack_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC : ouvrir un pack
-- -----------------------------------------------------------------------------
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

  -- Pack a ouvrir : celui demande, sinon le plus ancien de l'inventaire.
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

  if not exists (select 1 from public.cards where set_id = v_type.set_id) then
    raise exception 'No cards available for this set';
  end if;

  select packs_since_legendary into v_pity from public.profiles where id = v_user_id for update;
  v_force_legendary := coalesce(v_pity, 0) >= v_pity_threshold;

  for i in 1 .. v_type.card_count loop
    -- Pity : on force une Legendaire sur le 1er slot si le seuil est atteint.
    if i = 1 and v_force_legendary then
      v_rarity := 'legendaire';
    else
      v_rarity := public.pick_rarity(v_type.weights);
    end if;

    -- Garantie Rare+ : sur le dernier slot, remonte la rarete si rien d'assez rare.
    if i = v_type.card_count
       and v_max_rarity < v_type.guaranteed_min_rarity
       and v_rarity < v_type.guaranteed_min_rarity then
      v_rarity := v_type.guaranteed_min_rarity;
    end if;

    select * into v_card
    from public.cards
    where set_id = v_type.set_id and rarity = v_rarity
    order by random()
    limit 1;

    if not found then
      -- Aucune carte de cette rarete : on retombe sur n'importe quelle carte du set.
      select * into v_card
      from public.cards
      where set_id = v_type.set_id
      order by random()
      limit 1;
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
      'country_code', v_card.country_code,
      'image_path', v_card.image_path,
      'duplicate', v_qty > 1
    );
  end loop;

  -- Pity : reset si Legendaire obtenue, sinon incremente.
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

-- -----------------------------------------------------------------------------
-- Drop d'un pack sur prono gagnant (trigger DEFENSIF : ne doit jamais faire
-- echouer le reglement). Chance ~10-30% selon la cote, cap 1/match/joueur.
-- -----------------------------------------------------------------------------
create or replace function public.maybe_award_pack_drop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chance numeric;
  v_drop_type uuid;
begin
  -- Pack par defaut utilise pour les drops.
  select id into v_drop_type
  from public.pack_types
  where code = 'standard' and is_active
  limit 1;

  if v_drop_type is null then
    return new;
  end if;

  -- Chance de base 10%, +2% par point de cote, plafonnee a 30%.
  v_chance := least(0.30, 0.10 + greatest(coalesce(new.odd_at_placement, 1) - 1, 0) * 0.02);

  if random() < v_chance then
    insert into public.user_packs (user_id, pack_type_id, source, match_id)
    values (new.user_id, v_drop_type, 'bet_drop', new.match_id)
    on conflict do nothing; -- cap 1/match/joueur via l'index partiel
  end if;

  return new;
exception
  when others then
    -- Une recompense cosmetique ne doit jamais annuler le reglement d'un match.
    return new;
end;
$$;

drop trigger if exists trg_award_pack_drop on public.bets;
create trigger trg_award_pack_drop
  after update on public.bets
  for each row
  when (
    new.status = 'won'
    and old.status is distinct from 'won'
    and new.bet_type in ('match_result', 'exact_score')
  )
  execute function public.maybe_award_pack_drop();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.card_sets enable row level security;
alter table public.cards enable row level security;
alter table public.pack_types enable row level security;
alter table public.user_packs enable row level security;
alter table public.user_cards enable row level security;
alter table public.pack_openings enable row level security;

-- Catalogue : lisible par tous les connectes, gere par les admins uniquement.
create policy card_sets_read on public.card_sets for select to authenticated using (true);
create policy cards_read on public.cards for select to authenticated using (true);
create policy pack_types_read on public.pack_types for select to authenticated using (true);

create policy card_sets_admin on public.card_sets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy cards_admin on public.cards for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy pack_types_admin on public.pack_types for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Donnees utilisateur : lecture par le proprietaire. Mutations via RPC (definer).
create policy user_packs_read on public.user_packs for select to authenticated
  using (user_id = auth.uid());
create policy user_cards_read on public.user_cards for select to authenticated
  using (user_id = auth.uid());
create policy pack_openings_read on public.pack_openings for select to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke all on function public.maybe_award_pack_drop() from public;
grant execute on function public.buy_pack(uuid) to authenticated;
grant execute on function public.open_pack(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Seed minimal : 1 set + 1 pack "standard" (catalogue de cartes a alimenter ensuite)
-- -----------------------------------------------------------------------------
insert into public.card_sets (code, name, season)
values ('wc2026', 'Coupe du Monde 2026', 2026)
on conflict (code) do nothing;

insert into public.pack_types (code, name, set_id, price_points, card_count, weights, guaranteed_min_rarity)
select
  'standard',
  'Pack Standard',
  s.id,
  100,
  5,
  '{"commune":70,"rare":22,"epique":6,"legendaire":2}'::jsonb,
  'rare'
from public.card_sets s
where s.code = 'wc2026'
on conflict (code) do nothing;

notify pgrst, 'reload schema';
