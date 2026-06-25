import { createAdminClient } from "@/lib/supabase/admin";
import type { CardRarity } from "@/lib/cards/types";

export interface SpecialCardSeed {
  code: string;
  name: string;
  rarity: CardRarity;
  category: string;
  position: string;
  country_code?: string | null;
  stats: Record<string, string | number | null>;
}

/** Catalogue des cartes spéciales (hors joueurs / nations). */
export const SPECIAL_CARDS_CATALOG: SpecialCardSeed[] = [
  {
    code: "special-12th-man",
    name: "Le 12e Homme",
    rarity: "rare",
    category: "special",
    position: "Supporters",
    stats: { icon: "crowd", subtitle: "La ferveur des tribunes" },
  },
  {
    code: "objet-whistle",
    name: "Coup de sifflet",
    rarity: "commune",
    category: "objet",
    position: "Objet",
    stats: { icon: "whistle" },
  },
  {
    code: "objet-var",
    name: "VAR",
    rarity: "rare",
    category: "objet",
    position: "Objet",
    stats: { icon: "var" },
  },
  {
    code: "objet-ball",
    name: "Ballon du match",
    rarity: "rare",
    category: "objet",
    position: "Objet",
    stats: { icon: "ball" },
  },
  {
    code: "stade-metlife",
    name: "MetLife Stadium",
    rarity: "legendaire",
    category: "stade",
    position: "Stade",
    country_code: "US",
    stats: {
      icon: "stadium",
      subtitle: "New York / New Jersey · Finale",
      city: "East Rutherford, NJ",
      hostCity: "New York / New Jersey",
      capacity: 80663,
    },
  },
  {
    code: "stade-sofi",
    name: "SoFi Stadium",
    rarity: "epique",
    category: "stade",
    position: "Stade",
    country_code: "US",
    stats: {
      icon: "stadium",
      subtitle: "Los Angeles",
      city: "Inglewood, CA",
      hostCity: "Los Angeles",
      capacity: 70492,
    },
  },
  {
    code: "stade-att",
    name: "AT&T Stadium",
    rarity: "epique",
    category: "stade",
    position: "Stade",
    country_code: "US",
    stats: {
      icon: "stadium",
      subtitle: "Dallas",
      city: "Arlington, TX",
      hostCity: "Dallas",
      capacity: 70649,
    },
  },
  {
    code: "stade-mercedes-benz",
    name: "Mercedes-Benz Stadium",
    rarity: "epique",
    category: "stade",
    position: "Stade",
    country_code: "US",
    stats: {
      icon: "stadium",
      subtitle: "Atlanta",
      city: "Atlanta, GA",
      hostCity: "Atlanta",
      capacity: 68239,
    },
  },
  {
    code: "stade-hard-rock",
    name: "Hard Rock Stadium",
    rarity: "epique",
    category: "stade",
    position: "Stade",
    country_code: "US",
    stats: {
      icon: "stadium",
      subtitle: "Miami",
      city: "Miami Gardens, FL",
      hostCity: "Miami",
      capacity: 64478,
    },
  },
  {
    code: "stade-gillette",
    name: "Gillette Stadium",
    rarity: "epique",
    category: "stade",
    position: "Stade",
    country_code: "US",
    stats: {
      icon: "stadium",
      subtitle: "Boston",
      city: "Foxborough, MA",
      hostCity: "Boston",
      capacity: 64146,
    },
  },
  {
    code: "stade-nrg",
    name: "NRG Stadium",
    rarity: "epique",
    category: "stade",
    position: "Stade",
    country_code: "US",
    stats: {
      icon: "stadium",
      subtitle: "Houston",
      city: "Houston, TX",
      hostCity: "Houston",
      capacity: 68777,
    },
  },
  {
    code: "stade-lincoln",
    name: "Lincoln Financial Field",
    rarity: "epique",
    category: "stade",
    position: "Stade",
    country_code: "US",
    stats: {
      icon: "stadium",
      subtitle: "Philadelphie",
      city: "Philadelphie, PA",
      hostCity: "Philadelphia",
      capacity: 68324,
    },
  },
  {
    code: "stade-levis",
    name: "Levi's Stadium",
    rarity: "epique",
    category: "stade",
    position: "Stade",
    country_code: "US",
    stats: {
      icon: "stadium",
      subtitle: "San Francisco Bay Area",
      city: "Santa Clara, CA",
      hostCity: "San Francisco Bay Area",
      capacity: 68827,
    },
  },
  {
    code: "stade-lumen",
    name: "Lumen Field",
    rarity: "epique",
    category: "stade",
    position: "Stade",
    country_code: "US",
    stats: {
      icon: "stadium",
      subtitle: "Seattle",
      city: "Seattle, WA",
      hostCity: "Seattle",
      capacity: 66925,
    },
  },
  {
    code: "stade-arrowhead",
    name: "Arrowhead Stadium",
    rarity: "epique",
    category: "stade",
    position: "Stade",
    country_code: "US",
    stats: {
      icon: "stadium",
      subtitle: "Kansas City",
      city: "Kansas City, MO",
      hostCity: "Kansas City",
      capacity: 69045,
    },
  },
  {
    code: "xi-1970s",
    name: "Onze des années 70",
    rarity: "legendaire",
    category: "legende",
    position: "Onze type",
    stats: { icon: "xi", decade: "1970s" },
  },
  {
    code: "xi-1980s",
    name: "Onze des années 80",
    rarity: "legendaire",
    category: "legende",
    position: "Onze type",
    stats: { icon: "xi", decade: "1980s" },
  },
  {
    code: "xi-1990s",
    name: "Onze des années 90",
    rarity: "legendaire",
    category: "legende",
    position: "Onze type",
    stats: { icon: "xi", decade: "1990s" },
  },
  {
    code: "xi-2000s",
    name: "Onze des années 2000",
    rarity: "legendaire",
    category: "legende",
    position: "Onze type",
    stats: { icon: "xi", decade: "2000s" },
  },
  {
    code: "xi-2010s",
    name: "Onze des années 2010",
    rarity: "legendaire",
    category: "legende",
    position: "Onze type",
    stats: { icon: "xi", decade: "2010s" },
  },
  {
    code: "xi-2020s",
    name: "Onze des années 2020",
    rarity: "legendaire",
    category: "legende",
    position: "Onze type",
    stats: { icon: "xi", decade: "2020s" },
  },
  {
    code: "trophee-maison",
    name: "Le Trophée",
    rarity: "legendaire",
    category: "trophee",
    position: "Récompense",
    stats: {
      icon: "trophy",
      subtitle: "Coupe stylisée (illustration maison)",
    },
  },
];

/** Cartes spéciales fictives retirées du catalogue (stades placeholder). */
const DEPRECATED_SPECIAL_CODES = [
  "stade-lumieres",
  "stade-cotiere",
  "stade-temple",
  "stade-colisée",
  "stade-canyon",
  "stade-horizon",
] as const;

export async function upsertSpecialCards(setId?: string): Promise<number> {
  const supabase = createAdminClient();

  let resolvedSetId = setId;
  if (!resolvedSetId) {
    const { data: setRow, error: setErr } = await supabase
      .from("card_sets")
      .select("id")
      .eq("code", "wc2026")
      .single();

    if (setErr || !setRow) {
      throw new Error("Set 'wc2026' introuvable.");
    }
    resolvedSetId = (setRow as { id: string }).id;
  }

  const rows = SPECIAL_CARDS_CATALOG.map((card) => ({
    set_id: resolvedSetId,
    code: card.code,
    name: card.name,
    rarity: card.rarity,
    category: card.category,
    country_code: card.country_code ?? null,
    position: card.position,
    team_id: null,
    image_path: null,
    stats: card.stats,
    is_active: true,
  }));

  const { error } = await supabase
    .from("cards")
    .upsert(rows, { onConflict: "code" });

  if (error) {
    throw new Error(`Upsert cartes spéciales: ${error.message}`);
  }

  if (DEPRECATED_SPECIAL_CODES.length > 0) {
    const { error: deprecateErr } = await supabase
      .from("cards")
      .update({ is_active: false })
      .eq("set_id", resolvedSetId)
      .in("code", [...DEPRECATED_SPECIAL_CODES]);
    if (deprecateErr) {
      throw new Error(`Désactivation anciens stades: ${deprecateErr.message}`);
    }
  }

  return rows.length;
}
