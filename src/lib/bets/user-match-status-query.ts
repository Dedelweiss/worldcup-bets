import { createClient } from "@/lib/supabase/server";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";

function emptyStatus(): UserMatchBetStatus {
  return {
    hasClassicBet: false,
    hasMatchResult: false,
    hasExactScore: false,
    openFunCount: 0,
    pendingFunToPlay: 0,
  };
}

export async function getUserMatchBetStatuses(
  userId: string,
  matchIds: number[],
): Promise<Record<number, UserMatchBetStatus>> {
  const uniqueIds = [...new Set(matchIds)];
  const result: Record<number, UserMatchBetStatus> = {};
  for (const id of uniqueIds) {
    result[id] = emptyStatus();
  }
  if (uniqueIds.length === 0) return result;

  const supabase = await createClient();

  const [betsRes, funRes] = await Promise.all([
    supabase
      .from("bets")
      .select("match_id, bet_type, market_id, fun_market_id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .in("match_id", uniqueIds),
    supabase
      .from("fun_markets")
      .select("id, match_id")
      .eq("status", "open")
      .in("match_id", uniqueIds),
  ]);

  const userFunMarketIds = new Set<string>();
  for (const bet of betsRes.data ?? []) {
    const mid = bet.match_id as number;
    const status = result[mid];
    if (!status) continue;

    if (bet.bet_type === "match_result") {
      status.hasClassicBet = true;
      status.hasMatchResult = true;
    }
    if (bet.bet_type === "exact_score") {
      status.hasClassicBet = true;
      status.hasExactScore = true;
    }
    if (bet.bet_type === "fun") {
      const funId =
        (bet.fun_market_id as string | null) ??
        (bet.market_id as string | null);
      if (funId) userFunMarketIds.add(funId);
    }
  }

  for (const market of funRes.data ?? []) {
    const mid = market.match_id as number;
    const status = result[mid];
    if (!status) continue;
    status.openFunCount += 1;
    if (!userFunMarketIds.has(market.id as string)) {
      status.pendingFunToPlay += 1;
    }
  }

  return result;
}
