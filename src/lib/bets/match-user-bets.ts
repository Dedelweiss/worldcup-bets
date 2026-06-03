import { parseExactScoreSelection } from "@/lib/exact-score";
import { createClient } from "@/lib/supabase/server";
import type { MatchResultSelection } from "@/types/database";

export interface MatchUserBet1n2 {
  selection: MatchResultSelection;
  is_boosted: boolean;
  odd_at_placement: number;
  potential_payout: number;
}

export interface MatchUserBetExactScore {
  home: number;
  away: number;
  odd_at_placement: number;
  potential_payout: number;
}

export interface MatchUserPendingBets {
  hasMatchResult: boolean;
  hasExactScore: boolean;
  matchResult: MatchUserBet1n2 | null;
  exactScore: MatchUserBetExactScore | null;
}

const EMPTY_PENDING: MatchUserPendingBets = {
  hasMatchResult: false,
  hasExactScore: false,
  matchResult: null,
  exactScore: null,
};

export async function getMatchUserPendingBets(
  matchId: number,
  userId: string,
): Promise<MatchUserPendingBets> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("bets")
    .select(
      "bet_type, selection, is_boosted, odd_at_placement, potential_payout",
    )
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .in("bet_type", ["match_result", "exact_score"]);

  if (!data?.length) return { ...EMPTY_PENDING };

  let matchResult: MatchUserBet1n2 | null = null;
  let exactScore: MatchUserBetExactScore | null = null;

  for (const row of data) {
    const selection = row.selection as Record<string, unknown> | null;

    if (row.bet_type === "match_result" && selection?.selection) {
      const side = selection.selection as MatchResultSelection;
      if (side === "home" || side === "draw" || side === "away") {
        matchResult = {
          selection: side,
          is_boosted: Boolean(row.is_boosted),
          odd_at_placement: Number(row.odd_at_placement),
          potential_payout: Number(row.potential_payout),
        };
      }
    }

    if (row.bet_type === "exact_score") {
      const parsed = parseExactScoreSelection(
        selection as { home?: number; away?: number },
      );
      if (parsed) {
        exactScore = {
          home: parsed.home,
          away: parsed.away,
          odd_at_placement: Number(row.odd_at_placement),
          potential_payout: Number(row.potential_payout),
        };
      }
    }
  }

  return {
    hasMatchResult: matchResult != null,
    hasExactScore: exactScore != null,
    matchResult,
    exactScore,
  };
}
