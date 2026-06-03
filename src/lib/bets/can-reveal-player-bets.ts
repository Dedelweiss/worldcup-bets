import type { MatchStatus } from "@/types/database";
import { hasKickoffStarted } from "@/lib/format";

/** Pronostics révélables en direct, après coup d'envoi, ou une fois le match terminé. */
export function canRevealPlayerBets(match: {
  status: MatchStatus;
  kickoff_at: string;
}): boolean {
  if (match.status === "postponed" || match.status === "cancelled") return false;
  if (match.status === "live" || match.status === "finished") return true;
  return hasKickoffStarted(match.kickoff_at);
}

/** Coup d'envoi passé mais le match n'est pas encore repassé en direct (sync en attente). */
export function isAwaitingLiveStatus(match: {
  status: MatchStatus;
  kickoff_at: string;
}): boolean {
  return (
    hasKickoffStarted(match.kickoff_at) &&
    match.status === "scheduled"
  );
}
