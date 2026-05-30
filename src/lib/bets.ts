import { createClient } from "@/lib/supabase/server";
import { normalizeMatch } from "@/lib/matches";
import type { BetRow } from "@/types/database";

export async function getUserBets(userId: string): Promise<BetRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bets")
    .select(
      `
      id, match_id, market_id, bet_type, selection, odd_at_placement,
      stake, potential_payout, status, placed_at,
      match:matches (
        id, round, status, kickoff_at,
        home_team:teams!matches_home_team_id_fkey (id, name, code, logo_url),
        away_team:teams!matches_away_team_id_fkey (id, name, code, logo_url)
      ),
      fun_market:fun_markets (id, question)
    `,
    )
    .eq("user_id", userId)
    .order("placed_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const r = row as Record<string, unknown>;
    const matchRaw = r.match;
    const match = Array.isArray(matchRaw) ? matchRaw[0] : matchRaw;
    const funRaw = r.fun_market;
    const fun_market = Array.isArray(funRaw) ? funRaw[0] : funRaw;
    return {
      ...r,
      match: match ? normalizeMatch(match) : match,
      fun_market: fun_market ?? null,
    } as BetRow;
  });
}
