import { createClient } from "@/lib/supabase/server";
import {
  computeLiveProvisionalBetPayout,
  type LiveProvisionalBet,
  type LiveProvisionalMatch,
} from "@/lib/bets/live-provisional-points";

type LiveMatchRow = LiveProvisionalMatch & { id: number };

type PendingBetRow = LiveProvisionalBet & {
  user_id: string;
  match_id: number;
};

async function fetchLiveMatches(): Promise<LiveMatchRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("id, status, home_score, away_score, is_golden")
    .eq("status", "live");

  return (data ?? []) as LiveMatchRow[];
}

async function fetchPendingBetsOnMatches(
  matchIds: number[],
  userIds?: string[],
): Promise<PendingBetRow[]> {
  if (matchIds.length === 0) return [];

  const supabase = await createClient();
  let query = supabase
    .from("bets")
    .select(
      "user_id, match_id, status, bet_type, selection, potential_payout, odd_at_placement, is_boosted",
    )
    .eq("status", "pending")
    .in("match_id", matchIds)
    .in("bet_type", ["match_result", "exact_score"]);

  if (userIds?.length) {
    query = query.in("user_id", userIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchPendingBetsOnMatches", error);
    return [];
  }

  return (data ?? []) as PendingBetRow[];
}

/** Points provisoires par joueur (matchs live uniquement). */
export async function getLiveProvisionalPointsByUser(
  userIds?: string[],
): Promise<Map<string, number>> {
  const liveMatches = await fetchLiveMatches();
  if (liveMatches.length === 0) return new Map();

  const matchById = new Map(liveMatches.map((m) => [m.id, m]));
  const bets = await fetchPendingBetsOnMatches(
    liveMatches.map((m) => m.id),
    userIds,
  );

  const byUser = new Map<string, number>();
  for (const bet of bets) {
    const match = matchById.get(bet.match_id);
    if (!match) continue;

    const payout = computeLiveProvisionalBetPayout(bet, match);
    if (payout <= 0) continue;

    byUser.set(bet.user_id, (byUser.get(bet.user_id) ?? 0) + payout);
  }

  return byUser;
}

export async function getUserLiveProvisionalPoints(userId: string): Promise<number> {
  const map = await getLiveProvisionalPointsByUser([userId]);
  return map.get(userId) ?? 0;
}

export async function hasActiveLiveProvisionalScoring(): Promise<boolean> {
  const map = await getLiveProvisionalPointsByUser();
  for (const value of map.values()) {
    if (value > 0) return true;
  }
  return false;
}

/** Classement live : points confirmés + provisoires. */
export async function computeLiveLeaderboardRank(
  userId: string,
  confirmedPoints: number,
): Promise<{ rank: number; totalPlayers: number } | null> {
  const provisional = await getLiveProvisionalPointsByUser();
  const hasLive = [...provisional.values()].some((v) => v > 0);
  if (!hasLive) return null;

  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("id, points");
  if (!profiles?.length) return null;

  const totals = profiles.map((p) => ({
    id: p.id as string,
    total:
      Number(p.points ?? 0) + (provisional.get(p.id as string) ?? 0),
  }));

  totals.sort((a, b) => b.total - a.total || b.id.localeCompare(a.id));

  const index = totals.findIndex((row) => row.id === userId);
  if (index === -1) return null;

  return { rank: index + 1, totalPlayers: totals.length };
}
