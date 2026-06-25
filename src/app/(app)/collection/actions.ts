"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { OpenPackResult } from "@/lib/cards/types";

export type BuyPackResult =
  | { success: true; packId: string }
  | { success: false; error: string };

function mapPackError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("not enough coins") || m.includes("not enough points")) {
    return "Vous n'avez pas assez de jetons pour ce pack.";
  }
  if (m.includes("pack unavailable")) {
    return "Ce pack n'est plus disponible.";
  }
  if (m.includes("no pack to open")) {
    return "Vous n'avez aucun pack à ouvrir.";
  }
  if (m.includes("no cards available")) {
    return "Le catalogue de cartes n'est pas encore disponible.";
  }
  if (m.includes("could not find the function")) {
    return "Exécutez supabase/migrations/094_card_collection.sql dans Supabase.";
  }
  return message;
}

export async function buyPackAction(
  packTypeId: string,
): Promise<BuyPackResult> {
  await requireAuth();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buy_pack", {
    p_pack_type_id: packTypeId,
  });

  if (error) {
    return { success: false, error: mapPackError(error.message) };
  }

  revalidatePath("/collection");
  revalidatePath("/dashboard");

  return { success: true, packId: data as string };
}

export type OpenPackActionResult =
  | { success: true; result: OpenPackResult }
  | { success: false; error: string };

export async function openPackAction(
  packId?: string,
): Promise<OpenPackActionResult> {
  await requireAuth();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_pack", {
    p_pack_id: packId ?? null,
  });

  if (error) {
    return { success: false, error: mapPackError(error.message) };
  }

  revalidatePath("/collection");
  revalidatePath("/dashboard");

  return { success: true, result: data as OpenPackResult };
}
