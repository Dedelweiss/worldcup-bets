import type { OddsApiOddsResponse } from "@/lib/odds-api/types";

function parseDecimal(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) && n > 1 ? n : null;
}

/** Moyenne des cotes ML (1N2) sur les bookmakers disponibles. */
export function parseOddsApiMatchResult(
  response: OddsApiOddsResponse,
): { home: number; draw: number; away: number } | null {
  const bookmakers = response.bookmakers;
  if (!bookmakers) return null;

  const homes: number[] = [];
  const draws: number[] = [];
  const aways: number[] = [];

  const ML_MARKET_NAMES = new Set([
    "ml",
    "1x2",
    "match result",
    "full time result",
    "moneyline",
    "3way",
  ]);

  for (const markets of Object.values(bookmakers)) {
    const ml = markets.find((m) =>
      ML_MARKET_NAMES.has((m.name ?? "").trim().toLowerCase()),
    );
    const row = ml?.odds?.[0];
    if (!row) continue;

    const h = parseDecimal(row.home);
    const d = parseDecimal(row.draw);
    const a = parseDecimal(row.away);
    if (h != null) homes.push(h);
    if (d != null) draws.push(d);
    if (a != null) aways.push(a);
  }

  if (homes.length === 0 || draws.length === 0 || aways.length === 0) {
    return null;
  }

  const avg = (arr: number[]) =>
    arr.reduce((s, v) => s + v, 0) / arr.length;

  return {
    home: Math.round(avg(homes) * 100) / 100,
    draw: Math.round(avg(draws) * 100) / 100,
    away: Math.round(avg(aways) * 100) / 100,
  };
}
