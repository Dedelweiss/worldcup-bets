import type { MatchResultSelection } from "@/types/database";

export interface UserMatchBetStatus {
  /** Au moins un pari classique (résultat ou score exact) en attente. */
  hasClassicBet: boolean;
  hasMatchResult: boolean;
  hasExactScore: boolean;
  /** Choix 1N2 en attente (pour surligner le calendrier). */
  matchResultSelection?: MatchResultSelection | null;
  /** Score exact en attente (pour surligner le calendrier). */
  exactScore?: { home: number; away: number } | null;
  /** Marchés fun ouverts sur ce match. */
  openFunCount: number;
  /** Marchés fun ouverts sur lesquels le joueur n'a pas encore parié. */
  pendingFunToPlay: number;
}

/** Met en avant les matchs avec pari fun en attente, puis ceux déjà joués. */
export function sortMatchesByUserPriority<T extends { id: number }>(
  matches: T[],
  statuses: Record<number, UserMatchBetStatus>,
): T[] {
  return [...matches].sort((a, b) => {
    const sa = statuses[a.id];
    const sb = statuses[b.id];
    const score = (s?: UserMatchBetStatus) => {
      if (!s) return 0;
      if (s.hasClassicBet && s.pendingFunToPlay > 0) return 3;
      if (s.pendingFunToPlay > 0) return 2;
      if (s.hasClassicBet) return 1;
      return 0;
    };
    return score(sb) - score(sa);
  });
}
