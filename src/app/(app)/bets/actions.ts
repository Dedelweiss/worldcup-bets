"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";

export type CancelBetResult =
  | { success: true }
  | { success: false; error: string };

export async function cancelBetAction(
  betId: string,
  matchId?: number,
): Promise<CancelBetResult> {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.rpc("cancel_pending_bet", {
    p_bet_id: betId,
  });

  if (error) {
    const msg = error.message.includes("Could not find the function")
      ? "Exécutez supabase/migrations/043_cancel_pending_bet.sql dans Supabase."
      : error.message.includes("Match has already started")
        ? "Le coup d'envoi est passé : ce pari ne peut plus être annulé."
        : error.message.includes("Betting is closed")
          ? "Les paris sont fermés pour ce match."
          : error.message.includes("Fun betting is closed")
            ? "Ce pari fun n'est plus annulable."
            : error.message.includes("Only pending")
              ? "Ce pari n'est plus en attente."
              : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/bets");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  if (matchId != null) {
    revalidatePath(`/matches/${matchId}`);
  }

  return { success: true };
}
