"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";

export type SetFavoriteTeamResult =
  | { success: true }
  | { success: false; error: string };

function mapError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already chosen")) {
    return "Vous avez déjà choisi votre équipe favorite.";
  }
  if (m.includes("invalid tournament team")) {
    return "Équipe invalide.";
  }
  if (message.includes("Could not find the function")) {
    return "Fonction indisponible. Exécutez la migration 035 dans Supabase.";
  }
  return message;
}

export async function setFavoriteTeamAction(
  teamId: number,
): Promise<SetFavoriteTeamResult> {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_favorite_team", {
    p_team_id: teamId,
  });

  if (error) {
    return { success: false, error: mapError(error.message) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { success: true };
}
