import { getStarTier, rarityForPlayer, isFamousPlayerName } from "@/lib/cards/player-stars";

export type CardCategory =
  | "joueur"
  | "nation"
  | "special"
  | "objet"
  | "stade"
  | "legende"
  | "trophee";

export const CARD_CATEGORIES: CardCategory[] = [
  "joueur",
  "nation",
  "special",
  "objet",
  "stade",
  "legende",
  "trophee",
];

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  joueur: "Joueurs",
  nation: "Nations",
  special: "Spéciales",
  objet: "Objets",
  stade: "Stades",
  legende: "Onze de légende",
  trophee: "Trophée",
};

export const CATEGORY_ICON: Record<CardCategory, string> = {
  joueur: "👤",
  nation: "🏳️",
  special: "👥",
  objet: "🎴",
  stade: "🏟️",
  legende: "⭐",
  trophee: "🏆",
};

/** Icône affichée sur la carte selon catégorie / stats.icon. */
export function cardDisplayIcon(
  category: string | null,
  iconKey?: string | null,
): string {
  switch (iconKey) {
    case "crowd":
      return "👥";
    case "whistle":
      return "🎺";
    case "var":
      return "📺";
    case "ball":
      return "⚽";
    case "stadium":
      return "🏟️";
    case "trophy":
      return "🏆";
    case "xi":
      return "⭐";
    default:
      break;
  }

  const cat = category as CardCategory;
  if (cat && CATEGORY_ICON[cat]) return CATEGORY_ICON[cat];
  return "🃏";
}

export function normalizeCategory(raw: string | null): CardCategory | "autre" {
  if (!raw) return "autre";
  if ((CARD_CATEGORIES as string[]).includes(raw)) {
    return raw as CardCategory;
  }
  return "autre";
}

export { getStarTier, rarityForPlayer, isFamousPlayerName };
