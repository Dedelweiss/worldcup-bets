import { createClient } from "@/lib/supabase/server";
import type { BetType, MatchResultSelection } from "@/types/database";

export interface MatchLiveBetRow {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  bet_type: BetType;
  selection: {
    selection?: MatchResultSelection;
    outcome?: string;
  };
  odd_at_placement: number;
  potential_payout: number;
  placed_at: string;
  fun_question: string | null;
}

export async function getMatchLiveBets(
  matchId: number,
): Promise<MatchLiveBetRow[]> {
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();

  if (!match || match.status !== "live") {
    return [];
  }

  const { data, error } = await supabase
    .from("bets")
    .select(
      `
      id,
      user_id,
      bet_type,
      selection,
      odd_at_placement,
      potential_payout,
      placed_at,
      profiles (display_name, username),
      fun_market:fun_markets (question)
    `,
    )
    .eq("match_id", matchId)
    .eq("status", "pending")
    .order("placed_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const r = row as Record<string, unknown>;
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const fun = Array.isArray(r.fun_market) ? r.fun_market[0] : r.fun_market;
    const p = profile as { display_name?: string; username?: string } | null;
    const f = fun as { question?: string } | null;

    return {
      id: r.id as string,
      user_id: r.user_id as string,
      display_name: p?.display_name ?? null,
      username: p?.username ?? null,
      bet_type: r.bet_type as BetType,
      selection: r.selection as MatchLiveBetRow["selection"],
      odd_at_placement: Number(r.odd_at_placement),
      potential_payout: Number(r.potential_payout),
      placed_at: r.placed_at as string,
      fun_question: f?.question ?? null,
    };
  });
}
