-- Limite d'achat de packs en boutique par jour et par joueur (configurable admin).

alter table public.tournament_config
  add column if not exists shop_pack_daily_limit integer not null default 1
    check (shop_pack_daily_limit >= 0);

comment on column public.tournament_config.shop_pack_daily_limit is
  'Nombre max de packs achetables par joueur et par jour (0 = illimité).';

create or replace function public.shop_pack_purchases_today(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.user_packs up
  where up.user_id = p_user_id
    and up.source = 'purchase'
    and (up.created_at at time zone 'Europe/Paris')::date
      = (now() at time zone 'Europe/Paris')::date;
$$;

create or replace function public.get_shop_pack_daily_limit()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select shop_pack_daily_limit from public.tournament_config where id = 1),
    1
  );
$$;

create or replace function public.get_shop_pack_daily_quota()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_used integer;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_expires timestamptz;
begin
  v_limit := public.get_shop_pack_daily_limit();

  if v_user_id is null then
    return jsonb_build_object(
      'limit', v_limit,
      'used', 0,
      'remaining', case when v_limit = 0 then null else v_limit end,
      'unlimited', v_limit = 0,
      'expires_at', ((v_today + 1)::timestamp at time zone 'Europe/Paris')
    );
  end if;

  v_used := public.shop_pack_purchases_today(v_user_id);
  v_expires := ((v_today + 1)::timestamp at time zone 'Europe/Paris');

  return jsonb_build_object(
    'limit', v_limit,
    'used', v_used,
    'remaining', case
      when v_limit = 0 then null
      else greatest(0, v_limit - v_used)
    end,
    'unlimited', v_limit = 0,
    'expires_at', v_expires
  );
end;
$$;

create or replace function public.admin_set_shop_pack_daily_limit(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_limit is null or p_limit < 0 then
    raise exception 'Limit must be >= 0 (0 = unlimited)';
  end if;

  v_limit := p_limit;

  update public.tournament_config
  set shop_pack_daily_limit = v_limit
  where id = 1;

  if not found then
    raise exception 'Tournament config not found';
  end if;

  return v_limit;
end;
$$;

-- buy_pack : vérifie le quota journalier avant débit.
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
  v_daily_limit integer;
  v_purchases_today integer;
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

  v_daily_limit := public.get_shop_pack_daily_limit();
  if v_daily_limit > 0 then
    v_purchases_today := public.shop_pack_purchases_today(v_user_id);
    if v_purchases_today >= v_daily_limit then
      raise exception 'Daily pack limit reached';
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

grant execute on function public.shop_pack_purchases_today(uuid) to authenticated;
grant execute on function public.get_shop_pack_daily_limit() to authenticated;
grant execute on function public.get_shop_pack_daily_quota() to authenticated;
grant execute on function public.admin_set_shop_pack_daily_limit(integer) to authenticated;

notify pgrst, 'reload schema';
