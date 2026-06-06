import { canRevealPlayerBets } from "@/lib/bets/can-reveal-player-bets";
import type { BetRow } from "@/types/database";

/** Paris pris en compte sur la carte FUT vue par un autre joueur (même règle que « Révéler »). */
export function filterBetsVisibleOnPublicFutCard(bets: BetRow[]): BetRow[] {
  return bets.filter((bet) => {
    if (!bet.match) return false;
    return canRevealPlayerBets(bet.match);
  });
}
