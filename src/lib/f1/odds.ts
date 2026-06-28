/** Cotes MVP : classement inverse simplifié (1er = favori). */

const MIN_ODD = 2.0;
const MAX_ODD = 25.0;
const DEFAULT_ODD = 8.0;

export function winnerOddFromRank(rank: number, fieldSize: number): number {
  if (rank < 1 || fieldSize < 1) return DEFAULT_ODD;
  const spread = Math.min(fieldSize - 1, 19);
  const step = (MAX_ODD - MIN_ODD) / Math.max(spread, 1);
  const odd = MIN_ODD + (rank - 1) * step;
  return Math.round(Math.min(MAX_ODD, Math.max(MIN_ODD, odd)) * 100) / 100;
}

export function assignWinnerOdds(
  driverNumbers: number[],
  championshipOrder?: number[],
): Map<number, number> {
  const odds = new Map<number, number>();
  const fieldSize = driverNumbers.length;

  if (!championshipOrder?.length) {
    for (const num of driverNumbers) {
      odds.set(num, DEFAULT_ODD);
    }
    return odds;
  }

  const rankByDriver = new Map<number, number>();
  championshipOrder.forEach((num, idx) => {
    rankByDriver.set(num, idx + 1);
  });

  let nextRank = championshipOrder.length + 1;
  for (const num of driverNumbers) {
    const rank = rankByDriver.get(num) ?? nextRank++;
    odds.set(num, winnerOddFromRank(rank, fieldSize));
  }

  return odds;
}

export function pointsFromOdd(odd: number): number {
  return Math.max(1, Math.round(odd * 10));
}
