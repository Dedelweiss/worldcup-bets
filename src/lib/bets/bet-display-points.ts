import {
  exactScorePointsForOdd,
  impliedMatchResult,
  parseExactScoreSelection,
} from "@/lib/exact-score";
import type { LiveProvisionalBet } from "@/lib/bets/live-provisional-points";
import { betDisplayPayout } from "@/lib/points";
import type { BetStatus, BetType, MatchStatus, ScorePrecision } from "@/types/database";

export type BetPointsTone = "won" | "lost" | "live" | "pending";

export interface BetPointsDisplay {
  points: number | null;
  label: string;
  tone: BetPointsTone;
}

export type BetForPointsDisplay = {
  bet_type: BetType;
  status: BetStatus;
  selection: LiveProvisionalBet["selection"];
  potential_payout: number;
  odd_at_placement: number;
  is_boosted: boolean;
  score_precision: ScorePrecision | null;
};

export type MatchForPointsDisplay = {
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  is_golden?: boolean | null;
};

function hasFinalScore(match: MatchForPointsDisplay): boolean {
  return match.home_score != null && match.away_score != null;
}

/** Résultat effectif d'un pari classique vs le score connu (même si pas encore clôturé). */
export function resolveEffectiveClassicOutcome(
  bet: BetForPointsDisplay,
  match: MatchForPointsDisplay,
): "won" | "lost" | "pending" | "unknown" {
  if (bet.status === "won") return "won";
  if (bet.status === "lost") return "lost";
  if (!hasFinalScore(match)) return "unknown";

  const home = match.home_score!;
  const away = match.away_score!;
  const resultSide = impliedMatchResult(home, away);

  if (bet.bet_type === "match_result") {
    const pick = bet.selection.selection;
    if (!pick) return "unknown";
    return pick === resultSide ? "won" : "lost";
  }

  if (bet.bet_type === "exact_score") {
    const pred = parseExactScoreSelection(bet.selection);
    if (!pred) return "unknown";
    if (pred.home === home && pred.away === away) return "won";
    if (impliedMatchResult(pred.home, pred.away) === resultSide) return "won";
    return "lost";
  }

  return "unknown";
}

function settledExactScorePoints(bet: BetForPointsDisplay): number {
  return bet.potential_payout;
}

function pendingExactScoreMaxPoints(
  bet: BetForPointsDisplay,
  isGoldenMatch: boolean,
): number {
  const golden = Boolean(isGoldenMatch);
  const base = exactScorePointsForOdd(bet.odd_at_placement, "exact");
  return golden ? base * 2 : base;
}

function projectedClassicPayout(
  bet: BetForPointsDisplay,
  match: MatchForPointsDisplay,
  outcome: "won" | "lost",
): number {
  if (outcome === "lost") return 0;

  const golden = Boolean(match.is_golden);

  if (bet.bet_type === "match_result") {
    return betDisplayPayout(
      bet.potential_payout,
      bet.is_boosted,
      golden,
    );
  }

  const pred = parseExactScoreSelection(bet.selection);
  if (!pred || !hasFinalScore(match)) return 0;

  const home = match.home_score!;
  const away = match.away_score!;

  if (pred.home === home && pred.away === away) {
    return golden
      ? exactScorePointsForOdd(bet.odd_at_placement, "exact") * 2
      : exactScorePointsForOdd(bet.odd_at_placement, "exact");
  }

  return golden
    ? exactScorePointsForOdd(bet.odd_at_placement, "tendance") * 2
    : exactScorePointsForOdd(bet.odd_at_placement, "tendance");
}

/**
 * Points et libellé à afficher pour un pari (aligné sur bet-list).
 * Ne jamais montrer le gain potentiel d'un pari perdant.
 */
export function resolveBetPointsDisplay(
  bet: BetForPointsDisplay,
  match: MatchForPointsDisplay,
): BetPointsDisplay {
  const isGoldenMatch = Boolean(match.is_golden);
  const isLive = match.status === "live";
  const effective = resolveEffectiveClassicOutcome(bet, match);

  if (bet.bet_type === "fun") {
    if (bet.status === "lost") {
      return { points: null, label: "Perdu", tone: "lost" };
    }
    if (bet.status === "won") {
      return {
        points: betDisplayPayout(
          bet.potential_payout,
          bet.is_boosted,
          isGoldenMatch,
        ),
        label: "Points gagnés",
        tone: "won",
      };
    }
    return {
      points: betDisplayPayout(
        bet.potential_payout,
        bet.is_boosted,
        isGoldenMatch,
      ),
      label: isLive ? "Points en jeu" : "Gain potentiel",
      tone: isLive ? "live" : "pending",
    };
  }

  if (bet.status === "lost" || effective === "lost") {
    return { points: null, label: "Perdu", tone: "lost" };
  }

  if (bet.status === "won") {
    if (bet.bet_type === "exact_score") {
      return {
        points: settledExactScorePoints(bet),
        label: "Points gagnés",
        tone: "won",
      };
    }
    return {
      points: betDisplayPayout(
        bet.potential_payout,
        bet.is_boosted,
        isGoldenMatch,
      ),
      label: "Points gagnés",
      tone: "won",
    };
  }

  if (isLive && hasFinalScore(match) && effective === "won") {
    return {
      points: projectedClassicPayout(bet, match, "won"),
      label: "Points en jeu",
      tone: "live",
    };
  }

  if (
    (match.status === "finished" || effective === "won") &&
    hasFinalScore(match) &&
    effective === "won"
  ) {
    return {
      points: projectedClassicPayout(bet, match, "won"),
      label: match.status === "finished" ? "Points gagnés" : "Points en jeu",
      tone: match.status === "finished" ? "won" : "live",
    };
  }

  if (bet.bet_type === "exact_score") {
    return {
      points: pendingExactScoreMaxPoints(bet, isGoldenMatch),
      label: isLive ? "Max si tout pile" : "Gain max (tout pile)",
      tone: isLive ? "live" : "pending",
    };
  }

  return {
    points: betDisplayPayout(
      bet.potential_payout,
      bet.is_boosted,
      isGoldenMatch,
    ),
    label: isLive ? "Points en jeu" : "Gain potentiel",
    tone: isLive ? "live" : "pending",
  };
}
