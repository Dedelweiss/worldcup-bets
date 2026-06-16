import { hasKickoffStarted } from "@/lib/format";
import type { BetRow } from "@/types/database";

const SETTLED_STATUSES = new Set<BetRow["status"]>([
  "won",
  "lost",
  "void",
  "cancelled",
]);

export function isBetSettled(status: BetRow["status"]): boolean {
  return SETTLED_STATUSES.has(status);
}

/** Pari annulable par le joueur depuis « Mes paris » (miroir de cancel_pending_bet). */
export function canCancelPendingBet(bet: BetRow): boolean {
  if (isBetSettled(bet.status)) return false;
  if (bet.status !== "pending") return false;

  if (bet.bet_type === "fun") {
    return bet.fun_market?.status === "open";
  }

  const match = bet.match;
  if (!match || match.status !== "scheduled") return false;
  if (hasKickoffStarted(match.kickoff_at)) return false;

  return bet.bet_type === "match_result" || bet.bet_type === "exact_score";
}

/** Annulable via « Supprimer tous mes paris » (hors matchs en direct, sauf fun ouverts). */
export function canBulkCancelPendingBet(bet: BetRow): boolean {
  if (bet.bet_type === "fun") {
    return canCancelPendingBet(bet);
  }
  if (bet.match?.status === "live") return false;
  return canCancelPendingBet(bet);
}
