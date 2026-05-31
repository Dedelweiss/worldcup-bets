import { createClient } from "@/lib/supabase/server";
import {
  fetchFunMarketSnippets,
  resolveFunMarketId,
} from "@/lib/bets/fun-market-lookup";
import { normalizeMatch } from "@/lib/matches";
import type { BetRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

const BET_BASE_FIELDS = `
  id, match_id, market_id, fun_market_id, bet_type, selection, odd_at_placement,
  stake, potential_payout, is_boosted, status, placed_at
`;

const MATCH_EMBED_BASE = `
  match:matches (
    id, round, status, kickoff_at,
    home_team:teams!matches_home_team_id_fkey (id, name, code, logo_url),
    away_team:teams!matches_away_team_id_fkey (id, name, code, logo_url)
  )
`;

const MATCH_EMBED_WITH_GOLDEN = `
  match:matches (
    id, round, status, kickoff_at, is_golden,
    home_team:teams!matches_home_team_id_fkey (id, name, code, logo_url),
    away_team:teams!matches_away_team_id_fkey (id, name, code, logo_url)
  )
`;

/** Variantes de select (rétrocompat si migrations pas encore appliquées en prod). */
const USER_BETS_SELECT_VARIANTS = [
  `${BET_BASE_FIELDS}, score_precision, ${MATCH_EMBED_WITH_GOLDEN}`,
  `${BET_BASE_FIELDS}, score_precision, ${MATCH_EMBED_BASE}`,
  `${BET_BASE_FIELDS}, ${MATCH_EMBED_BASE}`,
] as const;

function mapBetRows(data: unknown[]): BetRow[] {
  return data.map((row) => {
    const r = row as Record<string, unknown>;
    const matchRaw = r.match;
    const match = Array.isArray(matchRaw) ? matchRaw[0] : matchRaw;
    return {
      ...r,
      score_precision: (r.score_precision as BetRow["score_precision"]) ?? null,
      is_boosted: Boolean(r.is_boosted),
      match: match ? normalizeMatch(match) : null,
      fun_market: null,
    } as BetRow;
  });
}

async function attachFunMarkets(
  supabase: SupabaseClient,
  rows: BetRow[],
): Promise<BetRow[]> {
  const funIds = rows
    .map((b) => resolveFunMarketId(b))
    .filter((id): id is string => id != null);

  const byId = await fetchFunMarketSnippets(supabase, funIds);

  return rows.map((b) => {
    const funId = resolveFunMarketId(b);
    if (!funId) return b;
    const snippet = byId.get(funId);
    return { ...b, fun_market: snippet ?? null };
  });
}

async function fetchUserBetsQuery(
  supabase: SupabaseClient,
  userId: string,
  select: string,
) {
  return supabase
    .from("bets")
    .select(select)
    .eq("user_id", userId)
    .order("placed_at", { ascending: false });
}

export async function getUserBets(userId: string): Promise<BetRow[]> {
  const supabase = await createClient();

  let lastError: string | null = null;

  for (const select of USER_BETS_SELECT_VARIANTS) {
    const { data, error } = await fetchUserBetsQuery(supabase, userId, select);

    if (!error && data) {
      return attachFunMarkets(supabase, mapBetRows(data));
    }

    lastError = error?.message ?? "unknown";
    if (process.env.NODE_ENV === "development") {
      console.error("[getUserBets] select failed:", lastError);
    }
  }

  if (lastError && process.env.NODE_ENV === "development") {
    console.error("[getUserBets] all variants failed:", lastError);
  }

  return [];
}
