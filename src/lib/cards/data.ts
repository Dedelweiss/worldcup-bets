import { createClient } from "@/lib/supabase/server";
import { MAX_CATALOG_CARDS } from "@/lib/cards/catalog-limits";
import {
  countActiveCatalogCards,
  fetchAllActiveCatalogCards,
} from "@/lib/cards/catalog-query";
import { ourTeamCodeToIso2, iso2ToName } from "@/lib/cards/nations";
import {
  buildShirtNumberIndex,
  resolveShirtNumber,
} from "@/lib/cards/shirt-numbers";
import { RARITY_ORDER } from "@/lib/cards/styles";
import type {
  AlbumCard,
  AlbumGroup,
  CardCatalogEntry,
  CollectionData,
  InventoryPack,
} from "@/lib/cards/types";

const SPECIAL_GROUP_KEY = "_special";

function rarityThenName(a: AlbumCard, b: AlbumCard): number {
  const r = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
  return r !== 0 ? r : a.name.localeCompare(b.name);
}

/** Regroupe l'album par nation (clé = country_code), cartes sans pays en "Spéciales". */
function groupByNation(album: AlbumCard[]): AlbumGroup[] {
  const buckets = new Map<string, AlbumCard[]>();
  for (const card of album) {
    const key = card.country_code ?? SPECIAL_GROUP_KEY;
    const list = buckets.get(key) ?? [];
    list.push(card);
    buckets.set(key, list);
  }

  const groups: AlbumGroup[] = [];
  for (const [key, cards] of buckets) {
    cards.sort(rarityThenName);
    groups.push({
      key,
      label:
        key === SPECIAL_GROUP_KEY
          ? "Spéciales"
          : (iso2ToName(key) ?? key.toUpperCase()),
      cards,
      ownedCount: cards.filter((c) => c.owned).length,
      totalCount: cards.length,
    });
  }

  groups.sort((a, b) => {
    if (a.key === SPECIAL_GROUP_KEY) return 1;
    if (b.key === SPECIAL_GROUP_KEY) return -1;
    return a.label.localeCompare(b.label);
  });

  return groups;
}

/**
 * Charge la collection complète d'un joueur.
 *
 * Perf : le catalogue (petit, cachable) est récupéré entièrement, et l'on
 * superpose un petit Set des cartes possédées (une requête indexée sur user_id),
 * plutôt que de joindre des milliers de lignes côté base.
 */
export async function getCollectionData(
  userId: string,
): Promise<CollectionData> {
  const supabase = await createClient();

  const [profileRes, teamsRes, ownedRes, inventoryRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("points, card_shards, pack_coins")
        .eq("id", userId)
        .single(),
      supabase.from("teams").select("id, code, squad"),
      supabase
        .from("user_cards")
        .select("card_id, quantity")
        .eq("user_id", userId),
      supabase
        .from("user_packs")
        .select("id, pack_type_id, source, pack_types(name)")
        .eq("user_id", userId)
        .order("created_at"),
    ]);

  const catalogRaw = await fetchAllActiveCatalogCards(supabase);
  const catalogTotal = await countActiveCatalogCards(supabase);

  const isoByTeamId = new Map<number, string>();
  const shirtByPlayerId = buildShirtNumberIndex(
    (teamsRes.data ?? []) as {
      squad: { id: number; shirtNumber: number | null }[] | null;
    }[],
  );
  for (const team of teamsRes.data ?? []) {
    const iso = ourTeamCodeToIso2(team.code);
    if (iso) isoByTeamId.set(team.id, iso);
  }

  const profile = (profileRes.data ?? {
    points: 0,
    card_shards: 0,
    pack_coins: 0,
  }) as {
    points: number;
    card_shards: number;
    pack_coins: number;
  };

  const catalog = catalogRaw.map((card) => {
    const country_code =
      card.country_code ??
      (card.team_id ? (isoByTeamId.get(card.team_id) ?? null) : null);
    const shirtNumber = resolveShirtNumber(
      card.code,
      card.stats,
      shirtByPlayerId,
    );
    const stats =
      shirtNumber != null
        ? { ...(card.stats ?? {}), shirtNumber }
        : card.stats;
    const { team_id: _teamId, ...rest } = card;
    return { ...rest, country_code, stats };
  }) as CardCatalogEntry[];

  const ownedMap = new Map<string, number>();
  for (const row of (ownedRes.data ?? []) as {
    card_id: string;
    quantity: number;
  }[]) {
    ownedMap.set(row.card_id, row.quantity);
  }

  // Numéro Panini stable : ordre alphabétique par code (indépendant de l'affichage).
  const numberByCode = new Map<string, number>();
  [...catalog]
    .sort((a, b) => a.code.localeCompare(b.code))
    .forEach((card, i) => numberByCode.set(card.code, i + 1));

  const album: AlbumCard[] = catalog.map((card) => ({
    ...card,
    owned: ownedMap.has(card.id),
    quantity: ownedMap.get(card.id) ?? 0,
    number: numberByCode.get(card.code) ?? 0,
  }));

  const groups = groupByNation(album);

  const displayTotal = Math.min(catalogTotal, album.length);

  const inventory: InventoryPack[] = (
    (inventoryRes.data ?? []) as {
      id: string;
      pack_type_id: string;
      source: "purchase" | "bet_drop";
      pack_types: { name: string } | { name: string }[] | null;
    }[]
  ).map((row) => {
    const pt = Array.isArray(row.pack_types) ? row.pack_types[0] : row.pack_types;
    return {
      id: row.id,
      pack_type_id: row.pack_type_id,
      pack_name: pt?.name ?? "Pack",
      source: row.source,
    };
  });

  return {
    points: profile.points ?? 0,
    coins: profile.pack_coins ?? 0,
    shards: profile.card_shards ?? 0,
    groups,
    inventory,
    ownedCount: album.filter((c) => c.owned).length,
    totalCount: displayTotal > 0 ? displayTotal : catalogTotal,
    catalogCap: MAX_CATALOG_CARDS,
  };
}
