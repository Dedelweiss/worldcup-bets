import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_CATALOG_CARDS } from "@/lib/cards/catalog-limits";

const WC_SET_CODE = "wc2026";
const PAGE_SIZE = 500;

export type ActiveCatalogRow = {
  id: string;
  code: string;
  name: string;
  rarity: string;
  category: string | null;
  country_code: string | null;
  position: string | null;
  image_path: string | null;
  stats: Record<string, unknown> | null;
  team_id: number | null;
};

async function getWcSetId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("card_sets")
    .select("id")
    .eq("code", WC_SET_CODE)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

function validCatalogQuery(
  supabase: SupabaseClient,
  setId: string,
  columns: string,
) {
  return supabase
    .from("cards")
    .select(columns)
    .eq("set_id", setId)
    .eq("is_active", true)
    .not("name", "is", null)
    .neq("name", "");
}

/**
 * Cartes valides du catalogue WC2026 (actives + nom non vide).
 * Préfère la RPC SQL ; repli client si migration 103 absente.
 */
export async function countActiveCatalogCards(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.rpc("count_wc2026_catalog_cards");
  if (!error && typeof data === "number") return data;

  const setId = await getWcSetId(supabase);
  if (!setId) return 0;

  const { count, error: countErr } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("set_id", setId)
    .eq("is_active", true)
    .not("name", "is", null)
    .neq("name", "");

  if (countErr) throw countErr;
  return Math.min(count ?? 0, MAX_CATALOG_CARDS);
}

/** Charge tout le catalogue valide (pagination stable par code). */
export async function fetchAllActiveCatalogCards(
  supabase: SupabaseClient,
): Promise<ActiveCatalogRow[]> {
  const setId = await getWcSetId(supabase);
  if (!setId) return [];

  const expected = await countActiveCatalogCards(supabase);
  const rows: ActiveCatalogRow[] = [];
  let from = 0;

  while (rows.length < expected && rows.length < MAX_CATALOG_CARDS) {
    const { data, error } = await validCatalogQuery(
      supabase,
      setId,
      "id, code, name, rarity, category, country_code, position, image_path, stats, team_id",
    )
      .order("code")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...(data as unknown as ActiveCatalogRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

/** IDs des cartes valides du catalogue (paginé, sans limite 1000 implicite). */
export async function fetchValidCatalogCardIds(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const setId = await getWcSetId(supabase);
  const ids = new Set<string>();
  if (!setId) return ids;

  const expected = await countActiveCatalogCards(supabase);
  let from = 0;

  while (ids.size < expected) {
    const { data, error } = await validCatalogQuery(supabase, setId, "id")
      .order("code")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data as unknown as { id: string }[]) ids.add(row.id);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return ids;
}

export async function countUserOwnedActiveCards(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("count_user_active_cards", {
    p_user_id: userId,
  });
  if (!error && typeof data === "number") return data;

  const activeIds = await fetchValidCatalogCardIds(supabase);
  if (activeIds.size === 0) return 0;

  const owned = new Set<string>();
  const idList = [...activeIds];

  for (let i = 0; i < idList.length; i += PAGE_SIZE) {
    const chunk = idList.slice(i, i + PAGE_SIZE);
    const { data: rows, error: ownedErr } = await supabase
      .from("user_cards")
      .select("card_id")
      .eq("user_id", userId)
      .in("card_id", chunk);

    if (ownedErr) throw ownedErr;
    for (const row of rows ?? []) owned.add(row.card_id);
  }

  return owned.size;
}
