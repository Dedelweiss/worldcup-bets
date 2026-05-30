-- Corrige / recrée admin_adjust_balance (visible par l'API Supabase)
-- Exécuter ce script si erreur "Could not find the function ... admin_adjust_balance"

drop function if exists public.admin_adjust_balance(uuid, numeric, text);
drop function if exists public.admin_adjust_balance(uuid, numeric);

create or replace function public.admin_adjust_balance(
  p_user_id uuid,
  p_amount numeric,
  p_reason text
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_new_balance numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_amount = 0 then
    raise exception 'Amount cannot be zero';
  end if;

  select balance into v_balance
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User not found';
  end if;

  v_new_balance := v_balance + p_amount;

  if v_new_balance < 0 then
    raise exception 'Balance cannot be negative';
  end if;

  update public.profiles
  set balance = v_new_balance
  where id = p_user_id;

  insert into public.transactions (user_id, type, amount, balance_after, metadata)
  values (
    p_user_id,
    'admin_adjustment',
    p_amount,
    v_new_balance,
    jsonb_build_object('reason', coalesce(p_reason, ''))
  );

  return v_new_balance;
end;
$$;

grant execute on function public.admin_adjust_balance(uuid, numeric, text) to authenticated;

-- Recharge le cache API Supabase (PostgREST)
notify pgrst, 'reload schema';
