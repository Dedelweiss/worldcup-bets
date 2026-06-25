import type { CardStats } from "@/lib/cards/types";

/** Extrait l'id football-data depuis le code carte `player-12345`. */
export function playerIdFromCardCode(code: string): number | null {
  if (!code.startsWith("player-")) return null;
  const id = Number(code.replace("player-", ""));
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function buildShirtNumberIndex(
  squads: { squad: { id: number; shirtNumber: number | null }[] | null }[],
): Map<number, number> {
  const map = new Map<number, number>();
  for (const team of squads) {
    if (!Array.isArray(team.squad)) continue;
    for (const player of team.squad) {
      if (
        typeof player.id === "number" &&
        typeof player.shirtNumber === "number" &&
        player.shirtNumber > 0
      ) {
        map.set(player.id, player.shirtNumber);
      }
    }
  }
  return map;
}

export function resolveShirtNumber(
  code: string,
  stats: CardStats | null | undefined,
  shirtByPlayerId: Map<number, number>,
): number | null {
  if (stats?.shirtNumber != null && stats.shirtNumber > 0) {
    return stats.shirtNumber;
  }
  const playerId = playerIdFromCardCode(code);
  if (playerId == null) return null;
  return shirtByPlayerId.get(playerId) ?? null;
}
