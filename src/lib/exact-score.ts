import { pointsFromOdd } from "@/lib/points";
import type { MatchResultSelection, MatchWithTeams, ScorePrecision } from "@/types/database";

/** Multiplicateur « tout pile » sur la base 1N2 équivalente. */
export const EXACT_SCORE_PERFECT_MULTIPLIER = 3;
/** Bonus minimum tout pile vs tendance (favoris). */
export const EXACT_SCORE_PERFECT_MIN_BONUS = 20;

/** Vainqueur implicite d'un score saisi. */
export function impliedMatchResult(
  home: number,
  away: number,
): MatchResultSelection {
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

export function impliedOddFromMatch(
  match: Pick<MatchWithTeams, "odd_home" | "odd_draw" | "odd_away">,
  side: MatchResultSelection,
): number | null {
  if (side === "home") return match.odd_home;
  if (side === "draw") return match.odd_draw;
  if (side === "away") return match.odd_away;
  return null;
}

/** Même barème qu'un 1N2 gagnant sur le même vainqueur. */
export function exactScorePointsTendance(odd: number): number {
  return pointsFromOdd(odd);
}

/** Toujours ≥ tendance ; récompense la précision sur les outsiders. */
export function exactScorePointsPerfect(odd: number): number {
  const base = pointsFromOdd(odd);
  return Math.max(
    base * EXACT_SCORE_PERFECT_MULTIPLIER,
    base + EXACT_SCORE_PERFECT_MIN_BONUS,
  );
}

export function exactScorePointsForOdd(
  odd: number,
  precision: ScorePrecision,
): number {
  return precision === "exact"
    ? exactScorePointsPerfect(odd)
    : exactScorePointsTendance(odd);
}

export function matchResultLabel(
  side: MatchResultSelection,
  homeTeam: string,
  awayTeam: string,
): string {
  if (side === "home") return `Victoire ${homeTeam} (1)`;
  if (side === "away") return `Victoire ${awayTeam} (2)`;
  return "Match nul (N)";
}

export function parseScoreInputs(
  homeRaw: string,
  awayRaw: string,
): { home: number; away: number } | null {
  if (homeRaw.trim() === "" || awayRaw.trim() === "") return null;
  const home = Number.parseInt(homeRaw, 10);
  const away = Number.parseInt(awayRaw, 10);
  if (
    Number.isNaN(home) ||
    Number.isNaN(away) ||
    home < 0 ||
    away < 0 ||
    home > 20 ||
    away > 20
  ) {
    return null;
  }
  return { home, away };
}

export function formatExactScoreSelection(home: number, away: number): string {
  return `${home} - ${away}`;
}

export function parseExactScoreSelection(selection: {
  home?: number;
  away?: number;
}): { home: number; away: number } | null {
  const home = selection.home;
  const away = selection.away;
  if (
    typeof home !== "number" ||
    typeof away !== "number" ||
    home < 0 ||
    away < 0
  ) {
    return null;
  }
  return { home, away };
}

export function scorePrecisionLabel(precision: ScorePrecision): string {
  if (precision === "exact") return "Tout pile";
  return "Tendance";
}

/** Points affichés pour un pari réglé (potential_payout en base). */
export function scorePrecisionPoints(
  potentialPayout: number,
  _precision: ScorePrecision,
): number {
  return potentialPayout;
}
