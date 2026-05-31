/** Multiplicateur : points gagnés = round(cote × MULTIPLIER), min 1 */
export const POINTS_ODD_MULTIPLIER = 10;

export function pointsFromOdd(odd: number): number {
  return Math.max(1, Math.round(odd * POINTS_ODD_MULTIPLIER));
}

/** Points affichés / gagnés si le pronostic est correct (×2 avec Boost). */
export function pointsIfWin(odd: number, boosted = false): number {
  const base = pointsFromOdd(odd);
  return boosted ? base * 2 : base;
}

/** Points affichés pour un pari enregistré (potential_payout = base en base). */
export function betDisplayPayout(
  potentialPayout: number,
  isBoosted?: boolean,
): number {
  return isBoosted ? potentialPayout * 2 : potentialPayout;
}
