import { createClient } from "@/lib/supabase/server";
import type { FunMarket } from "@/types/database";

export async function getFunMarketsByMatch(
  matchId: number,
): Promise<FunMarket[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fun_markets")
    .select(
      "id, match_id, question, odd_yes, odd_no, status, winning_outcome, created_at",
    )
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  return (data ?? []) as FunMarket[];
}

export async function getFunMarketsForAdmin(matchId: number) {
  return getFunMarketsByMatch(matchId);
}

export function isFunMarketOpen(market: FunMarket): boolean {
  return market.status === "open";
}
