import type { TacklePhase } from "@/types/database";

export interface AdminUserTackle {
  id: string;
  phase: TacklePhase;
  matchId: number;
  isResolved: boolean;
}

export interface AdminUserJokers {
  boostsAvailable: number;
  hasPendingBoostedBet: boolean;
  tackles: AdminUserTackle[];
}

interface TackleRow {
  id: string;
  attacker_id: string;
  phase: TacklePhase;
  match_id: number;
  is_resolved: boolean;
}

export function buildAdminUserJokersMap(
  tackles: TackleRow[],
  boostedBetUserIds: string[],
): Map<string, Pick<AdminUserJokers, "hasPendingBoostedBet" | "tackles">> {
  const boosted = new Set(boostedBetUserIds);
  const tackleMap = new Map<string, AdminUserTackle[]>();

  for (const row of tackles) {
    const list = tackleMap.get(row.attacker_id) ?? [];
    list.push({
      id: row.id,
      phase: row.phase,
      matchId: row.match_id,
      isResolved: row.is_resolved,
    });
    tackleMap.set(row.attacker_id, list);
  }

  const userIds = new Set([...boosted, ...tackleMap.keys()]);
  const result = new Map<
    string,
    Pick<AdminUserJokers, "hasPendingBoostedBet" | "tackles">
  >();

  for (const userId of userIds) {
    result.set(userId, {
      hasPendingBoostedBet: boosted.has(userId),
      tackles: tackleMap.get(userId) ?? [],
    });
  }

  return result;
}

export function tacklePhaseLabel(phase: TacklePhase): string {
  return phase === "group" ? "Poules" : "Éliminatoires";
}
