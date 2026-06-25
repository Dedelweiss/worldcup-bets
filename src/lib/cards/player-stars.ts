import type { CardRarity } from "@/lib/cards/types";

export type StarTier = "superstar" | "star";

/** Superstars → Légendaire (présents / attendus CDM 2026). */
export const SUPERSTAR_HINTS = [
  "messi",
  "ronaldo",
  "cristiano",
  "mbappé",
  "mbappe",
  "neymar",
  "haaland",
  "kane",
  "salah",
  "modrić",
  "modric",
  "de bruyne",
  "bellingham",
  "vinícius",
  "vinicius",
  "yamal",
  "courtois",
  "rodri",
];

/** Stars reconnues → Épique. */
export const STAR_HINTS = [
  "demblé",
  "dembele",
  "griezmann",
  "musiala",
  "pedri",
  "gavi",
  "foden",
  "saka",
  "rice",
  "valverde",
  "martínez",
  "martinez",
  "alvarez",
  "díaz",
  "diaz",
  "osimhen",
  "kvaratskhelia",
  "kimmich",
  "son",
  "pulisic",
  "donnarumma",
  "alisson",
  "van dijk",
  "hakimi",
  "davies",
  "hernández",
  "hernandez",
  "raphinha",
  "güler",
  "guler",
  "wirtz",
  "palmer",
  "endrick",
];

function nameMatches(name: string, hints: string[]): boolean {
  const lower = name.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
}

export function getStarTier(name: string): StarTier | null {
  if (nameMatches(name, SUPERSTAR_HINTS)) return "superstar";
  if (nameMatches(name, STAR_HINTS)) return "star";
  return null;
}

/** Rareté basée uniquement sur la popularité du joueur. */
export function rarityForPlayer(name: string): CardRarity {
  const tier = getStarTier(name);
  if (tier === "superstar") return "legendaire";
  if (tier === "star") return "epique";
  return "commune";
}

export function isFamousPlayerName(name: string): boolean {
  return getStarTier(name) !== null;
}
