import { createClient } from "@/lib/supabase/server";
import { MAX_CATALOG_CARDS } from "@/lib/cards/catalog-limits";
import {
  countActiveCatalogCards,
  countUserOwnedActiveCards,
  fetchAllActiveCatalogCards,
  fetchCatalogNumberByCode,
  fetchUserOwnedActiveCards,
  type ActiveCatalogRow,
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
import type { SupabaseClient } from "@supabase/supabase-js";

const SPECIAL_GROUP_KEY = "_special";

function rarityThenName(a: AlbumCard, b: AlbumCard): number {
  const r = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
  return r !== 0 ? r : a.name.localeCompare(b.name);
}

/** Regroupe l'album par nation (clé = country_code), cartes sans pays en "Spéciales". */
export function groupByNation(album: AlbumCard[]): AlbumGroup[] {
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

function enrichCatalogRow(
  card: ActiveCatalogRow,
  isoByTeamId: Map<number, string>,
  shirtByPlayerId: Map<number, number>,
): CardCatalogEntry {
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
  return { ...rest, country_code, stats } as CardCatalogEntry;
}

async function loadCollectionContext(supabase: SupabaseClient, userId: string) {
  const [profileRes, teamsRes, inventoryRes, catalogTotal, ownedCount] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("points, card_shards, pack_coins")
        .eq("id", userId)
        .single(),
      supabase.from("teams").select("id, code, squad"),
      supabase
        .from("user_packs")
        .select("id, pack_type_id, source, pack_types(name)")
        .eq("user_id", userId)
        .order("created_at"),
      countActiveCatalogCards(supabase),
      countUserOwnedActiveCards(supabase, userId),
    ]);

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

  const inventory: InventoryPack[] = (
    (inventoryRes.data ?? []) as {
      id: string;
      pack_type_id: string;
      source: "purchase" | "bet_drop";
      pack_types: { name: string } | { name: string }[] | null;
    }[]
  ).map((row) => {
    const pt = Array.isArray(row.pack_types)
      ? row.pack_types[0]
      : row.pack_types;
    return {
      id: row.id,
      pack_type_id: row.pack_type_id,
      pack_name: pt?.name ?? "Pack",
      source: row.source,
    };
  });

  return {
    profile,
    isoByTeamId,
    shirtByPlayerId,
    inventory,
    catalogTotal,
    ownedCount,
  };
}

function toAlbumCard(
  entry: CardCatalogEntry,
  ownedMap: Map<string, number>,
  numberByCode: Map<string, number>,
): AlbumCard {
  return {
    ...entry,
    owned: ownedMap.has(entry.id),
    quantity: ownedMap.get(entry.id) ?? 0,
    number: numberByCode.get(entry.code) ?? 0,
  };
}

/**
 * Charge la collection d'un joueur (cartes possédées uniquement pour l'affichage).
 *
 * L'album complet (~1000 cartes) est chargé à la demande via getFullAlbumGroups
 * quand le joueur bascule en vue « album ».
 */
export async function getCollectionData(
  userId: string,
): Promise<CollectionData> {
  const supabase = await createClient();

  const [ctx, ownedRows, numberByCode] = await Promise.all([
    loadCollectionContext(supabase, userId),
    fetchUserOwnedActiveCards(supabase, userId),
    fetchCatalogNumberByCode(supabase),
  ]);

  const album: AlbumCard[] = ownedRows.map(({ card, quantity }) => {
    const entry = enrichCatalogRow(
      card,
      ctx.isoByTeamId,
      ctx.shirtByPlayerId,
    );
    return {
      ...entry,
      owned: true,
      quantity,
      number: numberByCode.get(entry.code) ?? 0,
    };
  });

  const groups = groupByNation(album);
  const displayTotal = ctx.catalogTotal;

  return {
    points: ctx.profile.points ?? 0,
    coins: ctx.profile.pack_coins ?? 0,
    shards: ctx.profile.card_shards ?? 0,
    groups,
    inventory: ctx.inventory,
    ownedCount: ctx.ownedCount,
    totalCount: displayTotal > 0 ? displayTotal : ctx.catalogTotal,
    catalogCap: MAX_CATALOG_CARDS,
  };
}

/** Album complet avec emplacements manquants (chargement à la demande). */
export async function getFullAlbumGroups(
  userId: string,
): Promise<AlbumGroup[]> {
  const supabase = await createClient();

  const [ctx, catalogRaw, ownedRes, numberByCode] = await Promise.all([
    loadCollectionContext(supabase, userId),
    fetchAllActiveCatalogCards(supabase),
    supabase
      .from("user_cards")
      .select("card_id, quantity")
      .eq("user_id", userId),
    fetchCatalogNumberByCode(supabase),
  ]);

  const ownedMap = new Map<string, number>();
  for (const row of (ownedRes.data ?? []) as {
    card_id: string;
    quantity: number;
  }[]) {
    ownedMap.set(row.card_id, row.quantity);
  }

  const catalog = catalogRaw.map((card) =>
    enrichCatalogRow(card, ctx.isoByTeamId, ctx.shirtByPlayerId),
  );

  const album = catalog.map((entry) =>
    toAlbumCard(entry, ownedMap, numberByCode),
  );

  return groupByNation(album);
}
