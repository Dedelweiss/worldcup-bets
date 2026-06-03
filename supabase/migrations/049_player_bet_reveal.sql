-- Révélation des pronostics : un joueur à la fois, après le coup d'envoi (RPC).

-- Ne plus exposer tous les paris dès le coup d'envoi via RLS.
drop policy if exists "Users view bets after kickoff" on public.bets;

-- -----------------------------------------------------------------------------
-- RPC : révéler le pari classique d'un joueur sur un match
-- -----------------------------------------------------------------------------
create or replace function public.get_player_match_bet_for_reveal(
  p_match_id integer,
  p_target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_match public.matches%rowtype;
  v_bet public.bets%rowtype;
begin
  if v_viewer is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.status in ('postponed', 'cancelled') then
    raise exception 'Pronostics not revealable for this match';
  end if;

  if v_match.status not in ('live', 'finished') and v_match.kickoff_at > now() then
    raise exception 'Match has not started';
  end if;

  select * into v_bet
  from public.bets b
  where b.match_id = p_match_id
    and b.user_id = p_target_user_id
    and b.bet_type in ('match_result', 'exact_score')
    and b.status in ('pending', 'won', 'lost')
  order by b.placed_at desc
  limit 1;

  if not found then
    raise exception 'No classic bet found for this player';
  end if;

  return jsonb_build_object(
    'id', v_bet.id,
    'user_id', v_bet.user_id,
    'bet_type', v_bet.bet_type,
    'selection', v_bet.selection,
    'odd_at_placement', v_bet.odd_at_placement,
    'potential_payout', v_bet.potential_payout,
    'is_boosted', v_bet.is_boosted,
    'status', v_bet.status,
    'score_precision', v_bet.score_precision
  );
end;
$$;

comment on function public.get_player_match_bet_for_reveal(integer, uuid) is
  'Retourne le pari classique d''un joueur — appelé au clic « Révéler » (match live ou terminé).';

grant execute on function public.get_player_match_bet_for_reveal(integer, uuid) to authenticated;

notify pgrst, 'reload schema';
