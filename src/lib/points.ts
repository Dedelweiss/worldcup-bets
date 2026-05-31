import { goldenMatchPoints } from "@/lib/golden-match";

/** Multiplicateur : points gagnés = round(cote × MULTIPLIER), min 1 */
export const POINTS_ODD_MULTIPLIER = 10;

export function pointsFromOdd(odd: number): number {
  return Math.max(1, Math.round(odd * POINTS_ODD_MULTIPLIER));
}

/** Points affichés / gagnés si le pronostic est correct (Boost et Golden Match cumulables). */
export function pointsIfWin(
  odd: number,
  boosted = false,
  goldenMatch = false,
): number {
  const base = pointsFromOdd(odd);
  const withBoost = boosted ? base * 2 : base;
  return goldenMatchPoints(withBoost, goldenMatch);
}

/** Points affichés pour un pari enregistré (potential_payout = base en base). */
export function betDisplayPayout(
  potentialPayout: number,
  isBoosted?: boolean,
  goldenMatch = false,
): number {
  const withBoost = isBoosted ? potentialPayout * 2 : potentialPayout;
  return goldenMatchPoints(withBoost, goldenMatch);
}
