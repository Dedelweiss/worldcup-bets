-- Suppression des données publiques d'un joueur (avant auth.admin.deleteUser)
-- Les DELETE utilisent WHERE true sur des sous-ensembles (exigence Supabase)

create or replace function public.admin_delete_user_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx bigint;
  v_bets bigint;
  v_members bigint;
  v_groups bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Cannot delete your own account';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found';
  end if;

  delete from public.transactions where user_id = p_user_id;
  get diagnostics v_tx = row_count;

  delete from public.bets where user_id = p_user_id;
  get diagnostics v_bets = row_count;

  delete from public.group_members where user_id = p_user_id;
  get diagnostics v_members = row_count;

  delete from public.groups where owner_id = p_user_id;
  get diagnostics v_groups = row_count;

  delete from public.profiles where id = p_user_id;

  return jsonb_build_object(
    'user_id', p_user_id,
    'transactions_deleted', v_tx,
    'bets_deleted', v_bets,
    'group_members_deleted', v_members,
    'groups_deleted', v_groups
  );
end;
$$;

grant execute on function public.admin_delete_user_data(uuid) to authenticated;

notify pgrst, 'reload schema';
