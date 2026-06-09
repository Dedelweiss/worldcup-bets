"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import { getUserBets } from "@/lib/bets";
import { canBulkCancelPendingBet } from "@/lib/bets/can-cancel-bet";
import { createClient } from "@/lib/supabase/server";

export type CancelBetResult =
  | { success: true }
  | { success: false; error: string };

export type CancelAllNonLiveBetsResult =
  | { success: true; cancelled: number; failed: number }
  | { success: false; error: string };

function mapCancelBetError(message: string): string {
  if (message.includes("Could not find the function")) {
    return "Exécutez supabase/migrations/043_cancel_pending_bet.sql dans Supabase.";
  }
  if (message.includes("Match has already started")) {
    return "Le coup d'envoi est passé : ce pari ne peut plus être annulé.";
  }
  if (message.includes("Betting is closed")) {
    return "Les paris sont fermés pour ce match.";
  }
  if (message.includes("Fun betting is closed")) {
    return "Ce pari fun n'est plus annulable.";
  }
  if (message.includes("Only pending")) {
    return "Ce pari n'est plus en attente.";
  }
  return message;
}

function revalidateAfterBetCancel(matchIds: number[]): void {
  revalidatePath("/bets");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  for (const matchId of matchIds) {
    revalidatePath(`/matches/${matchId}`);
  }
}

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
    return { success: false, error: mapCancelBetError(error.message) };
  }

  revalidateAfterBetCancel(matchId != null ? [matchId] : []);

  return { success: true };
}

/** Annule tous les paris en attente dont le match n'est pas en direct. */
export async function cancelAllNonLivePendingBetsAction(): Promise<CancelAllNonLiveBetsResult> {
  const profile = await requireAuth();
  const bets = await getUserBets(profile.id);
  const eligible = bets.filter(canBulkCancelPendingBet);

  if (eligible.length === 0) {
    return { success: true, cancelled: 0, failed: 0 };
  }

  const supabase = await createClient();
  let cancelled = 0;
  let failed = 0;
  const matchIds = new Set<number>();

  for (const bet of eligible) {
    const { error } = await supabase.rpc("cancel_pending_bet", {
      p_bet_id: bet.id,
    });

    if (error) {
      failed += 1;
      if (process.env.NODE_ENV === "development") {
        console.error(`[cancelAllNonLive] bet ${bet.id}:`, error.message);
      }
    } else {
      cancelled += 1;
      matchIds.add(bet.match_id);
    }
  }

  revalidateAfterBetCancel([...matchIds]);

  return { success: true, cancelled, failed };
}
