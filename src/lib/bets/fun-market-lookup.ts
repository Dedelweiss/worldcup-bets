import type { SupabaseClient } from "@supabase/supabase-js";

export type FunMarketSnippet = { id: string; question: string };

/** ID du marché fun lié au pari. */
export function resolveFunMarketId(bet: {
  bet_type: string;
  market_id?: string | null;
  fun_market_id?: string | null;
  selection?: unknown;
}): string | null {
  if (bet.bet_type !== "fun") return null;
  if (bet.fun_market_id) return bet.fun_market_id;
  if (bet.market_id) return bet.market_id;
  const sel = bet.selection as { fun_market_id?: string } | null | undefined;
  return sel?.fun_market_id ?? null;
}

export async function fetchFunMarketSnippets(
  supabase: SupabaseClient,
  marketIds: string[],
): Promise<Map<string, FunMarketSnippet>> {
  const unique = [...new Set(marketIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from("fun_markets")
    .select("id, question")
    .in("id", unique);

  if (error || !data) return new Map();

  return new Map(
    data.map((row) => [
      row.id as string,
      { id: row.id as string, question: row.question as string },
    ]),
  );
}
