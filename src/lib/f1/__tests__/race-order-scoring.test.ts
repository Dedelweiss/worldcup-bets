import { describe, expect, it } from "vitest";
import {
  F1_RACE_ORDER_MAX_POINTS,
  raceOrderPointsForDelta,
  scoreRaceOrder,
} from "@/lib/f1/race-order-scoring";

describe("raceOrderPointsForDelta", () => {
  it("applique le barème ±3", () => {
    expect(raceOrderPointsForDelta(0)).toBe(10);
    expect(raceOrderPointsForDelta(1)).toBe(6);
    expect(raceOrderPointsForDelta(2)).toBe(3);
    expect(raceOrderPointsForDelta(3)).toBe(1);
    expect(raceOrderPointsForDelta(4)).toBe(0);
    expect(raceOrderPointsForDelta(-2)).toBe(3);
  });
});

describe("scoreRaceOrder", () => {
  const results = [
    { driver_number: 4, position: 1 },
    { driver_number: 1, position: 2 },
    { driver_number: 63, position: 3 },
    { driver_number: 16, position: 4 },
    { driver_number: 81, position: 5 },
    { driver_number: 44, position: 6 },
    { driver_number: 55, position: 7 },
    { driver_number: 23, position: 8 },
    { driver_number: 10, position: 9 },
    { driver_number: 27, position: 10 },
  ];

  it("score parfait = 115 pts (100 + bonus P1)", () => {
    const order = [4, 1, 63, 16, 81, 44, 55, 23, 10, 27];
    expect(scoreRaceOrder(order, results)).toBe(F1_RACE_ORDER_MAX_POINTS);
  });

  it("bonus P1 si vainqueur correct en tête", () => {
    const order = [4, 1, 63, 16, 81, 44, 55, 23, 10, 27];
    expect(scoreRaceOrder(order, results)).toBe(115);
    // Verstappen vainqueur prédit P2 : pas de bonus +15
    const noBonus = [1, 4, 63, 16, 81, 44, 55, 23, 10, 27];
    expect(scoreRaceOrder(noBonus, results)).toBe(92);
  });

  it("pénalise un écart de 1 place", () => {
    const order = [1, 4, 63, 16, 81, 44, 55, 23, 10, 27];
    // P1↔P2 inversés : 2 pilotes à 6 pts au lieu de 10 → 92
    expect(scoreRaceOrder(order, results)).toBe(92);
  });

  it("retourne 0 si ordre invalide", () => {
    expect(scoreRaceOrder([4, 1], results)).toBe(0);
  });
});
