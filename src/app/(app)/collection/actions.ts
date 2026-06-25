"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { OpenPackResult } from "@/lib/cards/types";

function mapPackError(message: string): string {
  const m = message.toLowerCase();
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
  revalidatePath("/shop");
  revalidatePath("/dashboard");

  return { success: true, result: data as OpenPackResult };
}
