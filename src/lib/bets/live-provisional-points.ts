import {
  exactScorePointsForOdd,
  impliedMatchResult,
  parseExactScoreSelection,
} from "@/lib/exact-score";
import { goldenMatchPoints } from "@/lib/golden-match";
import { betDisplayPayout } from "@/lib/points";
import type { BetStatus, BetType, MatchResultSelection, MatchStatus } from "@/types/database";

export type LiveProvisionalMatch = {
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  is_golden?: boolean | null;
};

export type LiveProvisionalBet = {
  status: BetStatus;
  bet_type: BetType;
  selection: {
    selection?: MatchResultSelection;
    home?: number;
    away?: number;
  };
  potential_payout: number;
  odd_at_placement: number;
  is_boosted?: boolean | null;
};

function withGolden(base: number, isGolden: boolean): number {
  return goldenMatchPoints(base, isGolden);
}

/** Points provisoires pour un pari pending sur un match live (hors bonus On Fire). */
export function computeLiveProvisionalBetPayout(
  bet: LiveProvisionalBet,
  match: LiveProvisionalMatch,
): number {
  if (bet.status !== "pending" || match.status !== "live") return 0;
  if (match.home_score == null || match.away_score == null) return 0;

  const golden = Boolean(match.is_golden);
  const liveSide = impliedMatchResult(match.home_score, match.away_score);

  if (bet.bet_type === "match_result") {
    const pick = bet.selection.selection;
    if (!pick || pick !== liveSide) return 0;
    return betDisplayPayout(
      bet.potential_payout,
      Boolean(bet.is_boosted),
      golden,
    );
  }

  if (bet.bet_type === "exact_score") {
    const pred = parseExactScoreSelection(bet.selection);
    if (!pred) return 0;

    if (pred.home === match.home_score && pred.away === match.away_score) {
      return withGolden(
        exactScorePointsForOdd(bet.odd_at_placement, "exact"),
        golden,
      );
    }

    if (impliedMatchResult(pred.home, pred.away) === liveSide) {
      return withGolden(
        exactScorePointsForOdd(bet.odd_at_placement, "tendance"),
        golden,
      );
    }
  }

  return 0;
}

export function sumLiveProvisionalPoints(
  payouts: Iterable<number>,
): number {
  let total = 0;
  for (const value of payouts) {
    if (value > 0) total += value;
  }
  return total;
}

export function effectivePoints(balance: number, livePoints = 0): number {
  return balance + Math.max(0, livePoints);
}
