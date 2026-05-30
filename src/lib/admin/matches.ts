import {
  getMatchById,
  MATCH_SELECT,
  normalizeMatch,
} from "@/lib/matches";
import { syncLiveMatches } from "@/lib/matches/sync-live";
import { createClient } from "@/lib/supabase/server";

export { getMatchById, normalizeMatch, MATCH_SELECT };

export async function getAdminMatches() {
  await syncLiveMatches();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .order("kickoff_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeMatch);
}

export async function getAdminMatch(id: number) {
  return getMatchById(id);
}

export async function getPendingBetsCount(matchId: number) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("bets")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .eq("status", "pending");

  return count ?? 0;
}
