import {
  MOCK_BADGE_CATALOG,
  MOCK_PLAYER_BADGES,
  type BadgeCatalogEntry,
  type PlayerBadge,
} from "@/lib/badges";
import { createClient } from "@/lib/supabase/server";

export interface UserBadgeCollection {
  catalog: BadgeCatalogEntry[];
  unlocked: PlayerBadge[];
  selectedIds: string[];
}

async function getProfileBadgeIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("profile_badge_ids")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.profile_badge_ids) return [];
  return data.profile_badge_ids.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
}

export async function getUserBadgeCollection(
  userId: string,
  selectedIds?: string[],
): Promise<UserBadgeCollection> {
  const supabase = await createClient();

  const [catalogRes, unlockedRes, resolvedSelected] = await Promise.all([
    supabase.rpc("get_all_badges"),
    supabase.rpc("get_user_unlocked_badges", { p_user_id: userId }),
    selectedIds != null
      ? Promise.resolve(selectedIds)
      : getProfileBadgeIds(userId),
  ]);

  if (catalogRes.error || unlockedRes.error) {
    return {
      catalog: MOCK_BADGE_CATALOG,
      unlocked: MOCK_PLAYER_BADGES,
      selectedIds: resolvedSelected,
    };
  }

  const catalog = (catalogRes.data ?? []).map(
    (row: {
      badge_id: string;
      name: string;
      description: string;
      icon_name: string;
    }) => ({
      id: row.badge_id,
      name: row.name,
      description: row.description,
      icon_name: row.icon_name,
    }),
  );

  const unlocked = (unlockedRes.data ?? []).map(
    (row: {
      badge_id: string;
      name: string;
      description: string;
      icon_name: string;
      unlocked_at: string;
    }) => ({
      id: row.badge_id,
      name: row.name,
      description: row.description,
      icon_name: row.icon_name,
      unlocked_at: row.unlocked_at,
    }),
  );

  return {
    catalog,
    unlocked,
    selectedIds: resolvedSelected,
  };
}
