import type { CardRarity, CardStats } from "@/lib/cards/types";

export type ShopCurrency = "pack_coins" | "card_shards";

export interface PackTypeShop {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_points: number;
  price_currency: ShopCurrency;
  card_count: number;
  weights: Record<string, number>;
  guaranteed_min_rarity: CardRarity;
  sort_order: number;
}

export interface PackDropRate {
  rarity: CardRarity;
  pct: number;
}

export interface DailyMarketListing {
  listing_id: string;
  slot_index: number;
  card_id: string;
  code: string;
  name: string;
  rarity: CardRarity;
  category: string | null;
  country_code: string | null;
  position: string | null;
  stats: CardStats | null;
  image_path: string | null;
  price_amount: number;
  price_currency: ShopCurrency;
  purchased: boolean;
  owned: boolean;
}

export interface DailyShopData {
  rotation_date: string;
  expires_at: string;
  listings: DailyMarketListing[];
}

export interface ShopData {
  coins: number;
  shards: number;
  packCount: number;
  packTypes: PackTypeShop[];
  dailyShop: DailyShopData;
}

export interface MarketPurchaseResult {
  card_id: string;
  code: string;
  name: string;
  rarity: CardRarity;
  duplicate: boolean;
  shards_gained: number;
}
