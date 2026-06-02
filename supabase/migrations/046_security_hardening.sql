-- Durcissement sécurité : profils, paris, fuites de pronostics, tacles

-- -----------------------------------------------------------------------------
-- 1. Profils : interdire la mise à jour directe (role, points, etc.)
--    Toutes les écritures passent par des RPC SECURITY DEFINER.
-- -----------------------------------------------------------------------------
drop policy if exists "Users can update own profile" on public.profiles;

-- -----------------------------------------------------------------------------
-- 2. Paris : interdire l'insertion directe (contournement de place_bet)
-- -----------------------------------------------------------------------------
drop policy if exists "Users insert own bets" on public.bets;

-- -----------------------------------------------------------------------------
-- 3. Gazette : pronostics visibles admin uniquement
-- -----------------------------------------------------------------------------
create or replace function public.get_match_bets_for_summary(p_match_id integer)
returns table (
  username text,
  display_name text,
  bet_type public.bet_type,
  selection jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    p.username::text,
    p.display_name::text,
    b.bet_type,
    b.selection
  from public.bets b
  join public.profiles p on p.id = b.user_id
  where b.match_id = p_match_id
    and b.status = 'pending'
    and b.bet_type in ('match_result', 'exact_score')
  order by coalesce(p.username, p.display_name, p.id::text);
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Tacles : visibles uniquement par les parties prenantes (+ admin)
-- -----------------------------------------------------------------------------
drop policy if exists tackles_select_authenticated on public.tackles;

create policy tackles_select_participants
  on public.tackles for select to authenticated
  using (
    attacker_id = auth.uid()
    or target_id = auth.uid()
    or public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- 5. sync_live_matches : serveur uniquement (plus d'appel client PostgREST)
-- -----------------------------------------------------------------------------
revoke execute on function public.sync_live_matches() from authenticated;
revoke execute on function public.sync_live_matches() from anon;

notify pgrst, 'reload schema';
