import { hasKickoffStarted } from "@/lib/format";
import type { BetRow } from "@/types/database";

/** Pari annulable par le joueur depuis « Mes paris » (miroir de cancel_pending_bet). */
export function canCancelPendingBet(bet: BetRow): boolean {
  if (bet.status !== "pending") return false;

  const match = bet.match;
  if (!match || match.status !== "scheduled") return false;
  if (hasKickoffStarted(match.kickoff_at)) return false;

  if (bet.bet_type === "fun") {
    return bet.fun_market?.status === "open";
  }

  return bet.bet_type === "match_result" || bet.bet_type === "exact_score";
}
