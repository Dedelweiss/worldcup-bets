import { createClient } from "@/lib/supabase/server";
import type { BetStatus, FunOutcome } from "@/types/database";

export interface MatchUserFunBet {
  id: string;
  marketId: string;
  outcome: FunOutcome;
  odd_at_placement: number;
  potential_payout: number;
  status: BetStatus;
}

export async function getMatchUserFunBets(
  matchId: number,
  userId: string,
): Promise<Map<string, MatchUserFunBet>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("bets")
    .select(
      "id, fun_market_id, market_id, selection, odd_at_placement, potential_payout, status",
    )
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .eq("bet_type", "fun")
    .in("status", ["pending", "won", "lost"]);

  const byMarket = new Map<string, MatchUserFunBet>();
  if (!data?.length) return byMarket;

  for (const row of data) {
    const selection = row.selection as { outcome?: string } | null;
    const outcome = selection?.outcome;
    if (outcome !== "yes" && outcome !== "no") continue;

    const marketId =
      (row.fun_market_id as string | null) ??
      (row.market_id as string | null) ??
      null;
    if (!marketId) continue;

    byMarket.set(marketId, {
      id: row.id as string,
      marketId,
      outcome,
      odd_at_placement: Number(row.odd_at_placement),
      potential_payout: Number(row.potential_payout),
      status: row.status as BetStatus,
    });
  }

  return byMarket;
}
