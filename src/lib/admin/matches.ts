import { createClient } from "@/lib/supabase/server";
import type { MatchWithTeams } from "@/types/database";

function normalizeMatch(row: unknown): MatchWithTeams {
  const m = row as Record<string, unknown>;
  const home = m.home_team;
  const away = m.away_team;
  return {
    ...m,
    home_team: Array.isArray(home) ? home[0] : home,
    away_team: Array.isArray(away) ? away[0] : away,
  } as MatchWithTeams;
}

const MATCH_SELECT = `
  id, round, status, kickoff_at, venue,
  home_score, away_score, odd_home, odd_draw, odd_away,
  home_team:teams!matches_home_team_id_fkey (id, name, code, logo_url),
  away_team:teams!matches_away_team_id_fkey (id, name, code, logo_url)
`;

export async function getAdminMatches() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .order("kickoff_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeMatch);
}

export async function getAdminMatch(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return normalizeMatch(data);
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
