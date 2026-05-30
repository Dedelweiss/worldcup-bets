"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import { canPlaceBetOnMatch, getMatchById } from "@/lib/matches";
import { createClient } from "@/lib/supabase/server";
import type { MatchResultSelection } from "@/types/database";

export type PlaceBetResult =
  | { success: true; betId: string }
  | { success: false; error: string };

function mapBetError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("insufficient balance")) {
    return "Solde insuffisant.";
  }
  if (m.includes("betting is closed") || m.includes("already started")) {
    return "Les paris sont fermés pour ce match.";
  }
  if (m.includes("odds have changed")) {
    return "Les cotes ont changé. Actualisez la page.";
  }
  if (m.includes("minimum stake")) {
    return "Mise minimum : 1 €.";
  }
  return message;
}

export async function placeBetAction(
  matchId: number,
  selection: MatchResultSelection,
  stake: number,
): Promise<PlaceBetResult> {
  await requireAuth();

  const match = await getMatchById(matchId);
  if (!match) {
    return { success: false, error: "Match introuvable." };
  }

  const { allowed, reason } = canPlaceBetOnMatch(match);
  if (!allowed) {
    return { success: false, error: reason ?? "Paris impossible." };
  }

  const oddMap = {
    home: match.odd_home!,
    draw: match.odd_draw!,
    away: match.odd_away!,
  };
  const odd = oddMap[selection];

  if (stake < 1) {
    return { success: false, error: "Mise minimum : 1 €." };
  }

  const supabase = await createClient();
  const { data: betId, error } = await supabase.rpc("place_bet", {
    p_match_id: matchId,
    p_bet_type: "match_result",
    p_selection: { selection },
    p_odd: odd,
    p_stake: stake,
  });

  if (error) {
    return { success: false, error: mapBetError(error.message) };
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/dashboard");
  revalidatePath("/bets");
  revalidatePath("/leaderboard");

  return { success: true, betId: betId as string };
}
