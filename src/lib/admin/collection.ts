import { createClient } from "@/lib/supabase/server";
import {
  countActiveCatalogCards,
  countUserOwnedActiveCards,
  fetchValidCatalogCardIds,
} from "@/lib/cards/catalog-query";

export interface CollectionCatalogStats {
  totalCards: number;
  nationCards: number;
  playerCards: number;
  packTypes: number;
}

export interface CollectionPlayerRow {
  id: string;
  display_name: string | null;
  username: string | null;
  pack_coins: number;
  card_shards: number;
  ownedCards: number;
  unopenedPacks: number;
}

export async function getCollectionCatalogStats(): Promise<CollectionCatalogStats> {
  const supabase = await createClient();

  const [totalCards, packTypesRes, setRes] = await Promise.all([
    countActiveCatalogCards(supabase),
    supabase.from("pack_types").select("id", { count: "exact", head: true }),
    supabase.from("card_sets").select("id").eq("code", "wc2026").maybeSingle(),
  ]);

  let playerCards = 0;
  let nationCards = 0;

  if (setRes.data?.id) {
    const [playersRes, nationsRes] = await Promise.all([
      supabase
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("set_id", setRes.data.id)
        .eq("is_active", true)
        .eq("category", "joueur")
        .not("name", "is", null)
        .neq("name", ""),
      supabase
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("set_id", setRes.data.id)
        .eq("is_active", true)
        .neq("category", "joueur")
        .not("name", "is", null)
        .neq("name", ""),
    ]);
    playerCards = playersRes.count ?? 0;
    nationCards = nationsRes.count ?? 0;
  }

  return {
    totalCards,
    nationCards,
    playerCards,
    packTypes: packTypesRes.count ?? 0,
  };
}

export async function getCollectionPlayers(): Promise<CollectionPlayerRow[]> {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username, pack_coins, card_shards")
    .order("display_name", { ascending: true });

  if (!profiles?.length) return [];

  const ids = profiles.map((p) => p.id);

  const [activeIds, packsRes] = await Promise.all([
    fetchValidCatalogCardIds(supabase),
    supabase.from("user_packs").select("user_id").in("user_id", ids),
  ]);

  const { data: ownedRows } = await supabase
    .from("user_cards")
    .select("user_id, card_id")
    .in("user_id", ids);

  const ownedByUser = new Map<string, number>();
  for (const id of ids) ownedByUser.set(id, 0);
  for (const row of ownedRows ?? []) {
    if (!activeIds.has(row.card_id)) continue;
    ownedByUser.set(row.user_id, (ownedByUser.get(row.user_id) ?? 0) + 1);
  }

  const packsByUser = new Map<string, number>();
  for (const row of packsRes.data ?? []) {
    packsByUser.set(row.user_id, (packsByUser.get(row.user_id) ?? 0) + 1);
  }

  return profiles.map((p) => ({
    id: p.id,
    display_name: p.display_name,
    username: p.username,
    pack_coins: Number(p.pack_coins ?? 0),
    card_shards: p.card_shards ?? 0,
    ownedCards: ownedByUser.get(p.id) ?? 0,
    unopenedPacks: packsByUser.get(p.id) ?? 0,
  }));
}

/** Compte fiable pour un seul joueur (grant panel refresh). */
export async function getPlayerOwnedCatalogCount(
  userId: string,
): Promise<number> {
  const supabase = await createClient();
  return countUserOwnedActiveCards(supabase, userId);
}
