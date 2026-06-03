import {
  formatExactScoreSelection,
  parseExactScoreSelection,
} from "@/lib/exact-score";
import { MATCH_RESULT_OUTCOME } from "@/lib/bets/match-result-copy";
import type { BetStatus, BetType, ScorePrecision } from "@/types/database";

export interface RevealedPlayerBet {
  id: string;
  user_id: string;
  bet_type: BetType;
  selection: {
    selection?: string;
    home?: number;
    away?: number;
  };
  odd_at_placement: number;
  potential_payout: number;
  is_boosted: boolean;
  status: BetStatus;
  score_precision: ScorePrecision | null;
}

const RESULT_LABEL: Record<string, string> = {
  home: MATCH_RESULT_OUTCOME.home,
  draw: MATCH_RESULT_OUTCOME.draw,
  away: MATCH_RESULT_OUTCOME.away,
};

export function formatRevealedBetLabel(bet: RevealedPlayerBet): string {
  if (bet.bet_type === "exact_score") {
    const parsed = parseExactScoreSelection(bet.selection);
    if (parsed) {
      return `Score ${formatExactScoreSelection(parsed.home, parsed.away)}`;
    }
    return "Score exact";
  }
  const sel = bet.selection?.selection ?? "";
  return RESULT_LABEL[sel] ?? sel;
}

export function parseRevealedPlayerBet(data: unknown): RevealedPlayerBet | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const betType = row.bet_type as BetType;
  if (betType !== "match_result" && betType !== "exact_score") return null;

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    bet_type: betType,
    selection: (row.selection as RevealedPlayerBet["selection"]) ?? {},
    odd_at_placement: Number(row.odd_at_placement),
    potential_payout: Number(row.potential_payout),
    is_boosted: Boolean(row.is_boosted),
    status: row.status as BetStatus,
    score_precision: (row.score_precision as ScorePrecision | null) ?? null,
  };
}
