import type { CardRarity } from "@/lib/cards/types";
import type { PackDropRate } from "@/lib/cards/shop-types";

const RARITY_ORDER: CardRarity[] = [
  "commune",
  "rare",
  "epique",
  "legendaire",
];

/** Probabilités par slot à partir des poids DB (affichage uniquement). */
export function packDropRates(weights: Record<string, number>): PackDropRate[] {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    return RARITY_ORDER.map((rarity) => ({ rarity, pct: 0 }));
  }

  return RARITY_ORDER.map((rarity) => {
    const w = weights[rarity] ?? 0;
    return {
      rarity,
      pct: Math.round((w / total) * 1000) / 10,
    };
  }).filter((row) => row.pct > 0);
}

export function guaranteedRarityLabel(rarity: CardRarity): string {
  switch (rarity) {
    case "rare":
      return "Rare minimum";
    case "epique":
      return "Épique minimum";
    case "legendaire":
      return "Légendaire minimum";
    default:
      return "Commune minimum";
  }
}
