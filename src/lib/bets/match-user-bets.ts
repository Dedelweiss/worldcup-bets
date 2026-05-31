import { createClient } from "@/lib/supabase/server";

export interface MatchUserPendingBets {
  hasMatchResult: boolean;
  hasExactScore: boolean;
}

export async function getMatchUserPendingBets(
  matchId: number,
  userId: string,
): Promise<MatchUserPendingBets> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("bets")
    .select("bet_type")
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .eq("status", "pending");

  const types = new Set((data ?? []).map((r) => r.bet_type as string));

  return {
    hasMatchResult: types.has("match_result"),
    hasExactScore: types.has("exact_score"),
  };
}
