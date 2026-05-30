"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { FunOutcome } from "@/types/database";

export type PlaceFunBetResult =
  | { success: true; betId: string }
  | { success: false; error: string };

function mapError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("insufficient")) return "Solde insuffisant.";
  if (m.includes("closed")) return "Ce pari fun est fermé.";
  if (m.includes("odds have changed")) return "Cotes modifiées — actualisez.";
  return message;
}

export async function placeFunBetAction(
  marketId: string,
  matchId: number,
  outcome: FunOutcome,
  stake: number,
): Promise<PlaceFunBetResult> {
  await requireAuth();

  if (stake < 1) {
    return { success: false, error: "Mise minimum : 1 €." };
  }

  const supabase = await createClient();
  const { data: market } = await supabase
    .from("fun_markets")
    .select("odd_yes, odd_no, status")
    .eq("id", marketId)
    .single();

  if (!market || market.status !== "open") {
    return { success: false, error: "Pari fun fermé." };
  }

  const odd = outcome === "yes" ? market.odd_yes : market.odd_no;

  const { data: betId, error } = await supabase.rpc("place_fun_bet", {
    p_market_id: marketId,
    p_outcome: outcome,
    p_odd: odd,
    p_stake: stake,
  });

  if (error) {
    return { success: false, error: mapError(error.message) };
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/bets");
  revalidatePath("/dashboard");
  return { success: true, betId: betId as string };
}
