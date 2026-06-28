export const F1_RACE_ORDER_SIZE = 10;

/** 10 × 10 pts positions + bonus vainqueur P1. */
export const F1_RACE_ORDER_WINNER_BONUS = 15;

export const F1_RACE_ORDER_MAX_POINTS =
  F1_RACE_ORDER_SIZE * 10 + F1_RACE_ORDER_WINNER_BONUS;

/** Points par écart de position (barème ±3). */
export function raceOrderPointsForDelta(delta: number): number {
  const d = Math.abs(Math.round(delta));
  if (d === 0) return 10;
  if (d === 1) return 6;
  if (d === 2) return 3;
  if (d === 3) return 1;
  return 0;
}

export interface F1RaceResultRow {
  driver_number: number;
  position: number;
}

export function getRaceWinnerDriverNumber(
  raceResults: F1RaceResultRow[],
): number | null {
  return raceResults.find((r) => r.position === 1)?.driver_number ?? null;
}

export function scoreRaceOrder(
  predictedOrder: number[],
  raceResults: F1RaceResultRow[],
): number {
  if (predictedOrder.length !== F1_RACE_ORDER_SIZE) return 0;

  const actualByDriver = new Map<number, number>();
  for (const row of raceResults) {
    actualByDriver.set(row.driver_number, row.position);
  }

  let total = 0;
  for (let i = 0; i < predictedOrder.length; i++) {
    const driverNumber = predictedOrder[i];
    const predictedPos = i + 1;
    const actualPos = actualByDriver.get(driverNumber) ?? 99;
    total += raceOrderPointsForDelta(Math.abs(predictedPos - actualPos));
  }

  const winner = getRaceWinnerDriverNumber(raceResults);
  if (winner != null && predictedOrder[0] === winner) {
    total += F1_RACE_ORDER_WINNER_BONUS;
  }

  return total;
}

export function raceOrderFromSelection(
  selection: unknown,
): number[] | null {
  if (!Array.isArray(selection)) return null;
  const nums = selection.filter((n) => typeof n === "number" && n > 0);
  if (nums.length !== F1_RACE_ORDER_SIZE) return null;
  return nums;
}

export function scoreRaceOrderBreakdown(
  predictedOrder: number[],
  raceResults: F1RaceResultRow[],
  driverNames: Map<number, string>,
): {
  total: number;
  winnerBonus: number;
  rows: {
    driverNumber: number;
    driverName: string;
    predicted: number;
    actual: number;
    points: number;
  }[];
} {
  const actualByDriver = new Map<number, number>();
  for (const row of raceResults) {
    actualByDriver.set(row.driver_number, row.position);
  }

  const rows = predictedOrder.map((driverNumber, i) => {
    const predicted = i + 1;
    const actual = actualByDriver.get(driverNumber) ?? 99;
    const points = raceOrderPointsForDelta(Math.abs(predicted - actual));
    return {
      driverNumber,
      driverName: driverNames.get(driverNumber) ?? `#${driverNumber}`,
      predicted,
      actual,
      points,
    };
  });

  const base = rows.reduce((s, r) => s + r.points, 0);
  const winner = getRaceWinnerDriverNumber(raceResults);
  const winnerBonus =
    winner != null && predictedOrder[0] === winner
      ? F1_RACE_ORDER_WINNER_BONUS
      : 0;

  return { total: base + winnerBonus, winnerBonus, rows };
}

export const RACE_ORDER_SCORING_LABELS = [
  { delta: 0, points: 10, label: "Position exacte" },
  { delta: 1, points: 6, label: "±1 place" },
  { delta: 2, points: 3, label: "±2 places" },
  { delta: 3, points: 1, label: "±3 places" },
  {
    delta: -1,
    points: F1_RACE_ORDER_WINNER_BONUS,
    label: "Bonus vainqueur en P1",
  },
] as const;
