import { createClient } from "@/lib/supabase/server";
import type { BetStatus, BetType, MatchResultSelection } from "@/types/database";

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
  is_boosted: boolean;
  status: BetStatus;
  placed_at: string;
  fun_question: string | null;
}

/** Paris du match visibles après le coup d'envoi (tous les joueurs). */
export async function getMatchRevealedBets(
  matchId: number,
): Promise<MatchLiveBetRow[]> {
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("kickoff_at")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return [];

  const kickoff = new Date(match.kickoff_at as string).getTime();
  if (Number.isNaN(kickoff) || kickoff > Date.now()) {
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
      is_boosted,
      status,
      placed_at,
      profiles (display_name, username, avatar_url),
      fun_market:fun_markets (question)
    `,
    )
    .eq("match_id", matchId)
    .in("status", ["pending", "won", "lost"])
    .order("placed_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const r = row as Record<string, unknown>;
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const fun = Array.isArray(r.fun_market) ? r.fun_market[0] : r.fun_market;
    const p = profile as {
      display_name?: string;
      username?: string;
      avatar_url?: string;
    } | null;
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
      is_boosted: Boolean(r.is_boosted),
      status: r.status as BetStatus,
      placed_at: r.placed_at as string,
      fun_question: f?.question ?? null,
    };
  });
}

/** @deprecated Alias — utiliser getMatchRevealedBets */
export const getMatchLiveBets = getMatchRevealedBets;
