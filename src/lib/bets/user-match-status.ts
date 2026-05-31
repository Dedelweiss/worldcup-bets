export interface UserMatchBetStatus {
  /** Au moins un pari classique (1N2 ou score exact) en attente. */
  hasClassicBet: boolean;
  hasMatchResult: boolean;
  hasExactScore: boolean;
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
