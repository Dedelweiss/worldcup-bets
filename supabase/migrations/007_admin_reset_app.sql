-- Réinitialisation complète pour tests (admin uniquement)

create or replace function public.admin_reset_app(
  p_delete_matches boolean default false,
  p_starting_balance numeric default 100.00
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bets_deleted bigint;
  v_tx_deleted bigint;
  v_fun_deleted bigint;
  v_matches_reset bigint;
  v_matches_deleted bigint;
  v_profiles_reset bigint;
  v_profile record;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_starting_balance < 0 then
    raise exception 'Starting balance must be >= 0';
  end if;

  -- 1. Ledger & paris (ordre FK) — WHERE requis par Supabase
  delete from public.transactions where true;
  get diagnostics v_tx_deleted = row_count;

  delete from public.bets where true;
  get diagnostics v_bets_deleted = row_count;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'fun_markets'
  ) then
    delete from public.fun_markets where true;
    get diagnostics v_fun_deleted = row_count;
  else
    v_fun_deleted := 0;
  end if;

  delete from public.bet_markets where true;

  -- 2. Matchs
  if p_delete_matches then
    delete from public.matches where true;
    get diagnostics v_matches_deleted = row_count;
    v_matches_reset := 0;
  else
    update public.matches
    set
      status = 'scheduled',
      home_score = null,
      away_score = null,
      settled_at = null
    where true;
    get diagnostics v_matches_reset = row_count;
    v_matches_deleted := 0;
  end if;

  -- 3. Bankrolls + bonus d'inscription dans le ledger
  update public.profiles
  set balance = p_starting_balance
  where true;
  get diagnostics v_profiles_reset = row_count;

  for v_profile in select id from public.profiles loop
    insert into public.transactions (user_id, type, amount, balance_after, metadata)
    values (
      v_profile.id,
      'signup_bonus',
      p_starting_balance,
      p_starting_balance,
      '{"reset": true, "virtual": true}'::jsonb
    );
  end loop;

  return jsonb_build_object(
    'transactions_deleted', v_tx_deleted,
    'bets_deleted', v_bets_deleted,
    'fun_markets_deleted', v_fun_deleted,
    'matches_reset', v_matches_reset,
    'matches_deleted', v_matches_deleted,
    'profiles_reset', v_profiles_reset,
    'starting_balance', p_starting_balance
  );
end;
$$;

grant execute on function public.admin_reset_app(boolean, numeric) to authenticated;

notify pgrst, 'reload schema';
