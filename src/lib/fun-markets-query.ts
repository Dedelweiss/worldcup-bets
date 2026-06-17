import type { FunBettingPhase, FunMarket } from "@/types/database";

/** Colonnes disponibles avant migration 082. */
export const FUN_MARKET_SELECT_LEGACY =
  "id, match_id, question, odd_yes, odd_no, status, winning_outcome, created_by, created_at, closed_at";

/** Colonnes complètes (082+). */
export const FUN_MARKET_SELECT_FULL = `${FUN_MARKET_SELECT_LEGACY}, betting_phase, closes_at`;

export function isFunMarketSchemaError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42703" ||
    message.includes("does not exist") ||
    message.includes("betting_phase") ||
    message.includes("closes_at")
  );
}

export function normalizeFunMarketRow(
  row: Record<string, unknown>,
): FunMarket {
  return {
    id: row.id as string,
    match_id: row.match_id as number,
    question: row.question as string,
    odd_yes: Number(row.odd_yes),
    odd_no: Number(row.odd_no),
    status: row.status as FunMarket["status"],
    betting_phase: (row.betting_phase as FunBettingPhase | undefined) ?? "pre_match",
    closes_at: (row.closes_at as string | null | undefined) ?? null,
    closed_at: (row.closed_at as string | null | undefined) ?? null,
    winning_outcome: (row.winning_outcome as FunMarket["winning_outcome"]) ?? null,
    created_by: (row.created_by as string | null | undefined) ?? null,
    created_at: row.created_at as string,
  };
}
