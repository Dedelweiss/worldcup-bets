-- Le quota journalier comptait user_packs (source = purchase), supprimés à l'ouverture.
-- On compte désormais les achats via le ledger transactions (horodatage d'achat).

create or replace function public.shop_pack_purchases_today(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.transactions t
  where t.user_id = p_user_id
    and (
      t.type = 'pack_purchase'
      or (
        t.type = 'shop_market_purchase'
        and coalesce(t.metadata ->> 'kind', '') = 'pack_purchase'
      )
    )
    and (t.created_at at time zone 'Europe/Paris')::date
      = (now() at time zone 'Europe/Paris')::date;
$$;

comment on function public.shop_pack_purchases_today(uuid) is
  'Achats boutique de packs aujourd''hui (Europe/Paris), y compris packs déjà ouverts.';

notify pgrst, 'reload schema';
