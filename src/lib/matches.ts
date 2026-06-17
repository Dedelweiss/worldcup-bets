import { cache } from "react";
import { syncLiveMatches } from "@/lib/matches/sync-live";
import { createClient } from "@/lib/supabase/server";
import type { MatchWithTeams } from "@/types/database";

export { canPlaceBetOnMatch } from "@/lib/bets/can-place-bet-on-match";

export function normalizeMatch(row: unknown): MatchWithTeams {
  const m = row as Record<string, unknown>;
  const home = m.home_team;
  const away = m.away_team;
  return {
    ...m,
    home_team: Array.isArray(home) ? home[0] : home,
    away_team: Array.isArray(away) ? away[0] : away,
  } as MatchWithTeams;
}

export const MATCH_SELECT = `
  id, round, status, stage, kickoff_at, venue, settled_at,
  tournament_group_id, bet_scope_note, is_golden, ai_summary,
  home_score, away_score, live_minute, live_injury_time,
  live_clock_anchor_at, live_clock_manual,
  odd_home, odd_draw, odd_away, odds_synced_at,
  goal_events, goal_events_synced_at, goal_events_source,
  home_team:teams!matches_home_team_id_fkey (id, name, code, logo_url),
  away_team:teams!matches_away_team_id_fkey (id, name, code, logo_url)
`;

export const getMatchById = cache(async (
  id: number,
  options?: { skipLiveSync?: boolean },
): Promise<MatchWithTeams | null> => {
  if (!options?.skipLiveSync) {
    await syncLiveMatches();
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return normalizeMatch(data);
});

/** Liste minimale des matchs pour les stats d'assiduité (FUT END). */
export async function getAllMatchesForStats(): Promise<
  Pick<MatchWithTeams, "id" | "status">[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("matches").select("id, status");

  if (error || !data) return [];
  return data as Pick<MatchWithTeams, "id" | "status">[];
}
