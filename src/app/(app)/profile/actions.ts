"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";

export type UpdateUsernameResult =
  | { success: true; username: string }
  | { success: false; error: string };

function mapUsernameError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("déjà pris") || m.includes("unique")) {
    return "Ce pseudo est déjà pris.";
  }
  if (m.includes("3 caractères")) {
    return "Le pseudo doit contenir au moins 3 caractères.";
  }
  if (m.includes("20 caractères")) {
    return "Le pseudo ne peut pas dépasser 20 caractères.";
  }
  if (m.includes("underscore") || m.includes("lettres")) {
    return "Uniquement lettres, chiffres et underscore (_).";
  }
  if (message.includes("Could not find the function")) {
    return "Fonction pseudo absente. Exécutez la migration 019 dans Supabase.";
  }
  return message;
}

export async function updateUsernameAction(
  username: string,
): Promise<UpdateUsernameResult> {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("update_username", {
    p_username: username.trim(),
  });

  if (error) {
    return { success: false, error: mapUsernameError(error.message) };
  }

  const normalized = String(data);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/matches", "layout");

  return { success: true, username: normalized };
}
