import { getUserMatchBetStatuses } from "@/lib/bets/user-match-status-query";
import { canPlaceBetOnMatch } from "@/lib/matches";
import { listMatchesForPlayers } from "@/lib/tournament/queries";
import type { MatchWithTeams } from "@/types/database";

/** Matchs programmés, cotes OK, sans pronostic classique du joueur. */
export async function getMatchesWithoutClassicBet(
  userId: string,
): Promise<MatchWithTeams[]> {
  const matches = await listMatchesForPlayers({ filter: "all", limit: 120 });
  if (matches.length === 0) return [];

  const betStatuses = await getUserMatchBetStatuses(
    userId,
    matches.map((m) => m.id),
  );

  return matches.filter(
    (m) =>
      canPlaceBetOnMatch(m).allowed && !betStatuses[m.id]?.hasClassicBet,
  );
}
