"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { MarketPurchaseResult } from "@/lib/cards/shop-types";

export type BuyPackResult =
  | { success: true; packId: string }
  | { success: false; error: string };

export type BuyMarketCardResult =
  | { success: true; result: MarketPurchaseResult }
  | { success: false; error: string };

function mapShopError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("not enough coins")) {
    return "Vous n'avez pas assez de jetons.";
  }
  if (m.includes("not enough shards")) {
    return "Vous n'avez pas assez d'éclats.";
  }
  if (m.includes("pack unavailable")) {
    return "Ce pack n'est plus disponible.";
  }
  if (m.includes("listing unavailable") || m.includes("card unavailable")) {
    return "Cette offre n'est plus disponible.";
  }
  if (m.includes("already purchased")) {
    return "Vous avez déjà acheté cette carte aujourd'hui.";
  }
  if (m.includes("daily pack limit")) {
    return "Vous avez atteint la limite d'achat de packs pour aujourd'hui.";
  }
  if (m.includes("could not find the function")) {
    return "Exécutez supabase/migrations/104_shop.sql et 106_shop_pack_daily_limit.sql dans Supabase.";
  }
  return message;
}

export async function buyPackAction(
  packTypeId: string,
  idempotencyKey: string,
): Promise<BuyPackResult> {
  await requireAuth();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buy_pack", {
    p_pack_type_id: packTypeId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    return { success: false, error: mapShopError(error.message) };
  }

  revalidatePath("/shop");
  revalidatePath("/collection");
  revalidatePath("/dashboard");

  return { success: true, packId: data as string };
}

export async function buyMarketCardAction(
  listingId: string,
  idempotencyKey: string,
): Promise<BuyMarketCardResult> {
  await requireAuth();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buy_daily_market_card", {
    p_listing_id: listingId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    return { success: false, error: mapShopError(error.message) };
  }

  revalidatePath("/shop");
  revalidatePath("/collection");

  return { success: true, result: data as MarketPurchaseResult };
}
