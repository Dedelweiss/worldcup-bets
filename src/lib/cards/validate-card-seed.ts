import type { CardRarity } from "@/lib/cards/types";

export interface PlayerCardSeed {
  set_id: string;
  code: string;
  name: string;
  rarity: CardRarity;
  category: "joueur";
  country_code: string | null;
  position: string | null;
  team_id: number;
  image_path: null;
  stats: {
    position: string | null;
    age: number | null;
    shirtNumber: number | null;
    goals: number;
    starTier?: string | null;
  };
}

export function isValidPlayerCardSeed(
  row: Partial<PlayerCardSeed>,
): row is PlayerCardSeed {
  if (!row.code?.startsWith("player-")) return false;
  if (!row.name?.trim()) return false;
  if (!row.set_id) return false;
  if (row.category !== "joueur") return false;
  if (typeof row.team_id !== "number" || row.team_id <= 0) return false;

  const playerId = Number(row.code.replace("player-", ""));
  if (!Number.isFinite(playerId) || playerId <= 0) return false;

  return true;
}
