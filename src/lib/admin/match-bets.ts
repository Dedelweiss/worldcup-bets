import { requireAdmin } from "@/lib/auth-server";
import { getMatchRevealedBets } from "@/lib/bets/match-live-bets";

/** Tous les paris révélables d'un match (admin). */
export async function getAdminMatchBets(matchId: number) {
  await requireAdmin();
  return getMatchRevealedBets(matchId);
}
