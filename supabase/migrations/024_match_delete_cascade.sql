-- Suppression d'un match : cascade paris, fun, chat, transactions liées

-- -----------------------------------------------------------------------------
-- Paris → supprimés avec le match (était ON DELETE RESTRICT)
-- -----------------------------------------------------------------------------
alter table public.bets
  drop constraint if exists bets_match_id_fkey;

alter table public.bets
  add constraint bets_match_id_fkey
  foreign key (match_id)
  references public.matches (id)
  on delete cascade;

-- -----------------------------------------------------------------------------
-- Transactions liées à un pari → supprimées avec le pari
-- -----------------------------------------------------------------------------
alter table public.transactions
  drop constraint if exists transactions_bet_id_fkey;

alter table public.transactions
  add constraint transactions_bet_id_fkey
  foreign key (bet_id)
  references public.bets (id)
  on delete cascade;

-- fun_markets, match_comments, bet_markets : déjà ON DELETE CASCADE vers matches
-- bracket_slots.match_id : ON DELETE SET NULL (011)

-- -----------------------------------------------------------------------------
-- RPC admin : suppression explicite + compteurs
-- -----------------------------------------------------------------------------
create or replace function public.admin_delete_match(p_match_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bets bigint;
  v_fun bigint;
  v_comments bigint;
  v_tx bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if not exists (select 1 from public.matches where id = p_match_id) then
    raise exception 'Match not found';
  end if;

  select count(*)::bigint into v_bets
  from public.bets where match_id = p_match_id;

  select count(*)::bigint into v_fun
  from public.fun_markets where match_id = p_match_id;

  select count(*)::bigint into v_comments
  from public.match_comments where match_id = p_match_id;

  select count(*)::bigint into v_tx
  from public.transactions t
  join public.bets b on b.id = t.bet_id
  where b.match_id = p_match_id;

  delete from public.matches where id = p_match_id;

  return jsonb_build_object(
    'match_id', p_match_id,
    'bets_deleted', v_bets,
    'fun_markets_deleted', v_fun,
    'comments_deleted', v_comments,
    'transactions_deleted', v_tx
  );
end;
$$;

grant execute on function public.admin_delete_match(integer) to authenticated;

notify pgrst, 'reload schema';
