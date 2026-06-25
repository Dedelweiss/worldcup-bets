-- Admin : reset et ajustement des éclats (card_shards).

create or replace function public.admin_adjust_card_shards(
  p_user_id uuid,
  p_amount integer,
  p_reason text default ''
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
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
  set card_shards = greatest(0, card_shards + p_amount)
  where id = p_user_id
  returning card_shards into v_new_balance;

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
      'unit', 'card_shards',
      'reason', coalesce(nullif(trim(p_reason), ''), 'admin')
    )
  );

  return v_new_balance;
end;
$$;

create or replace function public.admin_reset_card_shards(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_user_id is null then
    update public.profiles set card_shards = 0;
  else
    update public.profiles set card_shards = 0 where id = p_user_id;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.admin_adjust_card_shards(uuid, integer, text) to authenticated;
grant execute on function public.admin_reset_card_shards(uuid) to authenticated;

notify pgrst, 'reload schema';
