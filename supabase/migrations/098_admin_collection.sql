-- Outils admin collection : crédit de jetons et reset d'album joueur.

create or replace function public.admin_adjust_pack_coins(
  p_user_id uuid,
  p_amount numeric,
  p_reason text default ''
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_user_id is null then
    raise exception 'User required';
  end if;

  if p_amount is null or p_amount = 0 then
    raise exception 'Amount must be non-zero';
  end if;

  update public.profiles
  set pack_coins = greatest(0, pack_coins + p_amount)
  where id = p_user_id
  returning pack_coins into v_new_balance;

  if not found then
    raise exception 'Profile not found';
  end if;

  insert into public.transactions (user_id, type, amount, balance_after, metadata)
  values (
    p_user_id,
    'admin_adjustment',
    p_amount,
    v_new_balance,
    jsonb_build_object(
      'unit', 'pack_coins',
      'reason', coalesce(nullif(trim(p_reason), ''), 'admin')
    )
  );

  return v_new_balance;
end;
$$;

create or replace function public.admin_reset_player_album(
  p_user_id uuid,
  p_reset_coins boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cards integer;
  v_packs integer;
  v_openings integer;
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

  delete from public.user_cards where user_id = p_user_id;
  get diagnostics v_cards = row_count;

  delete from public.user_packs where user_id = p_user_id;
  get diagnostics v_packs = row_count;

  delete from public.pack_openings where user_id = p_user_id;
  get diagnostics v_openings = row_count;

  update public.profiles
  set
    card_shards = 0,
    packs_since_legendary = 0,
    pack_coins = case when p_reset_coins then 0 else pack_coins end
  where id = p_user_id;

  return jsonb_build_object(
    'user_id', p_user_id,
    'cards_removed', v_cards,
    'packs_removed', v_packs,
    'openings_removed', v_openings,
    'coins_reset', p_reset_coins
  );
end;
$$;

grant execute on function public.admin_adjust_pack_coins(uuid, numeric, text) to authenticated;
grant execute on function public.admin_reset_player_album(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
