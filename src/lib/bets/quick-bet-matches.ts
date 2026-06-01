import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import { canPlaceBetOnMatch } from "@/lib/matches";
import type { MatchWithTeams } from "@/types/database";

/** Match de poule éligible au mode swipe (résultat simple, sans pronostic déjà posé). */
export function isGroupStageMatch(match: MatchWithTeams): boolean {
  if (match.stage) return match.stage === "group";
  return /groupe/i.test(match.round ?? "");
}

export function isQuickBetEligible(
  match: MatchWithTeams,
  betStatus?: UserMatchBetStatus,
): boolean {
  if (!isGroupStageMatch(match)) return false;
  if (betStatus?.hasClassicBet) return false;
  return canPlaceBetOnMatch(match).allowed;
}

export function filterQuickBetMatches(
  matches: MatchWithTeams[],
  betStatuses: Record<number, UserMatchBetStatus>,
): MatchWithTeams[] {
  return matches
    .filter((m) => isQuickBetEligible(m, betStatuses[m.id]))
    .sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
    );
}
