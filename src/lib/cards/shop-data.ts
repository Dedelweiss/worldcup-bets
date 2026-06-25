import { createClient } from "@/lib/supabase/server";
import type { CardRarity } from "@/lib/cards/types";
import type {
  DailyShopData,
  PackTypeShop,
  ShopData,
  ShopPackDailyQuota,
} from "@/lib/cards/shop-types";

export async function getShopData(userId: string): Promise<ShopData> {
  const supabase = await createClient();

  const [profileRes, packTypesRes, packCountRes, dailyRes, quotaRes] =
    await Promise.all([
    supabase
      .from("profiles")
      .select("pack_coins, card_shards")
      .eq("id", userId)
      .single(),
    supabase
      .from("pack_types")
      .select(
        "id, code, name, description, price_points, price_currency, card_count, weights, guaranteed_min_rarity, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order")
      .order("price_points"),
    supabase
      .from("user_packs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase.rpc("get_daily_shop", { p_set_code: "wc2026" }),
    supabase.rpc("get_shop_pack_daily_quota"),
  ]);

  const profile = profileRes.data ?? { pack_coins: 0, card_shards: 0 };

  const packTypes = ((packTypesRes.data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      price_points: row.price_points as number,
      price_currency: row.price_currency as PackTypeShop["price_currency"],
      card_count: row.card_count as number,
      weights: (row.weights as Record<string, number>) ?? {},
      guaranteed_min_rarity: row.guaranteed_min_rarity as CardRarity,
      sort_order: (row.sort_order as number) ?? 0,
    }),
  );

  let dailyShop: DailyShopData = {
    rotation_date: "",
    expires_at: new Date().toISOString(),
    listings: [],
  };

  if (dailyRes.error) {
    console.warn("[shop] get_daily_shop:", dailyRes.error.message);
  } else if (dailyRes.data && typeof dailyRes.data === "object") {
    const raw = dailyRes.data as {
      rotation_date?: string;
      expires_at?: string;
      listings?: DailyShopData["listings"];
    };
    dailyShop = {
      rotation_date: raw.rotation_date ?? "",
      expires_at: raw.expires_at ?? new Date().toISOString(),
      listings: raw.listings ?? [],
    };
  }

  let packDailyQuota: ShopPackDailyQuota = {
    limit: 1,
    used: 0,
    remaining: 1,
    unlimited: false,
    expires_at: new Date().toISOString(),
  };

  if (quotaRes.error) {
    console.warn("[shop] get_shop_pack_daily_quota:", quotaRes.error.message);
  } else if (quotaRes.data && typeof quotaRes.data === "object") {
    const raw = quotaRes.data as ShopPackDailyQuota;
    packDailyQuota = {
      limit: raw.limit ?? 1,
      used: raw.used ?? 0,
      remaining: raw.remaining ?? null,
      unlimited: raw.unlimited ?? raw.limit === 0,
      expires_at: raw.expires_at ?? new Date().toISOString(),
    };
  }

  return {
    coins: Number(profile.pack_coins ?? 0),
    shards: profile.card_shards ?? 0,
    packCount: packCountRes.count ?? 0,
    packTypes,
    dailyShop,
    packDailyQuota,
  };
}
