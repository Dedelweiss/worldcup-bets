import {
  fetchFunMarketSnippets,
  resolveFunMarketId,
} from "@/lib/bets/fun-market-lookup";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BetStatus,
  BetType,
  MatchResultSelection,
  ScorePrecision,
} from "@/types/database";

export interface MatchLiveBetRow {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bet_type: BetType;
  selection: {
    selection?: MatchResultSelection;
    outcome?: string;
    home?: number;
    away?: number;
  };
  odd_at_placement: number;
  potential_payout: number;
  is_boosted: boolean;
  status: BetStatus;
  score_precision: ScorePrecision | null;
  placed_at: string;
  fun_question: string | null;
}

function mapMatchBetRows(
  data: Record<string, unknown>[],
  funById: Map<string, { question: string }>,
): MatchLiveBetRow[] {
  return data.map((row) => {
    const r = row;
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const p = profile as {
      display_name?: string;
      username?: string;
      avatar_url?: string;
    } | null;

    const funId = resolveFunMarketId({
      bet_type: r.bet_type as string,
      market_id: r.market_id as string | null,
      fun_market_id: r.fun_market_id as string | null,
      selection: r.selection,
    });
    const funSnippet = funId ? funById.get(funId) : undefined;

    return {
      id: r.id as string,
      user_id: r.user_id as string,
      display_name: p?.display_name ?? null,
      username: p?.username ?? null,
      avatar_url: (p?.avatar_url as string | null) ?? null,
      bet_type: r.bet_type as BetType,
      selection: r.selection as MatchLiveBetRow["selection"],
      odd_at_placement: Number(r.odd_at_placement),
      potential_payout: Number(r.potential_payout),
      is_boosted: Boolean(r.is_boosted),
      status: r.status as BetStatus,
      score_precision: (r.score_precision as ScorePrecision | null) ?? null,
      placed_at: r.placed_at as string,
      fun_question: funSnippet?.question ?? null,
    };
  });
}

async function fetchMatchBets(
  supabase: SupabaseClient,
  matchId: number,
  options?: { requireKickoffPassed?: boolean },
): Promise<MatchLiveBetRow[]> {
  if (options?.requireKickoffPassed !== false) {
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
      score_precision,
      placed_at,
      market_id,
      fun_market_id,
      profiles (display_name, username, avatar_url)
    `,
    )
    .eq("match_id", matchId)
    .in("status", ["pending", "won", "lost"])
    .order("placed_at", { ascending: true });

  if (error || !data) return [];

  const funIds = data
    .map((row) =>
      resolveFunMarketId({
        bet_type: row.bet_type as string,
        market_id: row.market_id as string | null,
        fun_market_id: row.fun_market_id as string | null,
        selection: row.selection,
      }),
    )
    .filter((id): id is string => id != null);

  const funById = await fetchFunMarketSnippets(supabase, funIds);

  return mapMatchBetRows(data as Record<string, unknown>[], funById);
}

/** Paris du match visibles après le coup d'envoi (joueurs connectés, RLS). */
export async function getMatchRevealedBets(
  matchId: number,
): Promise<MatchLiveBetRow[]> {
  const supabase = await createClient();
  return fetchMatchBets(supabase, matchId, { requireKickoffPassed: true });
}

/** Tous les paris d'un match — service role, sans garde coup d'envoi (admin). */
export async function fetchAdminMatchBets(
  supabase: SupabaseClient,
  matchId: number,
): Promise<MatchLiveBetRow[]> {
  return fetchMatchBets(supabase, matchId, { requireKickoffPassed: false });
}

/** @deprecated Alias — utiliser getMatchRevealedBets */
export const getMatchLiveBets = getMatchRevealedBets;
