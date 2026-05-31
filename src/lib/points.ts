/** Multiplicateur : points gagnés = round(cote × MULTIPLIER), min 1 */
export const POINTS_ODD_MULTIPLIER = 10;

export function pointsFromOdd(odd: number): number {
  return Math.max(1, Math.round(odd * POINTS_ODD_MULTIPLIER));
}
