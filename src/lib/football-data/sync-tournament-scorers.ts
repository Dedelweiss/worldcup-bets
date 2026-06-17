import { cache } from "react";
import { fetchWcScorers, hasFootballDataConfig } from "@/lib/football-data/client";
import type { FootballDataScorerEntry } from "@/lib/football-data/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/auth-server";
import type { TournamentScorer } from "@/types/database";

export const TOURNAMENT_SCORERS_SYNC_LIVE_MS = 15 * 60 * 1000;
export const TOURNAMENT_SCORERS_SYNC_IDLE_MS = 60 * 60 * 1000;

function playerName(entry: FootballDataScorerEntry): string {
  const p = entry.player;
  if (p.name?.trim()) return p.name.trim();
  return [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
}

export function mapFootballDataScorers(
  entries: FootballDataScorerEntry[] | undefined,
): TournamentScorer[] {
  if (!entries?.length) return [];

  return entries
    .filter((e) => e.goals > 0 && e.player?.id && e.team?.id)
    .map((e) => ({
      playerId: e.player.id,
      playerName: playerName(e),
      teamFootballDataId: e.team.id,
      teamName: e.team.name,
      teamTla: e.team.tla ?? null,
      goals: e.goals,
      assists: e.assists ?? null,
      playedMatches: e.playedMatches ?? null,
    }))
    .filter((e) => e.playerName.length > 0)
    .sort((a, b) => b.goals - a.goals || a.playerName.localeCompare(b.playerName, "fr"));
}

export type SyncTournamentScorersResult = {
  synced: boolean;
  count: number;
  apiCalls: number;
  error?: string;
};

export async function syncTournamentScorersFromApi(): Promise<SyncTournamentScorersResult> {
  if (!hasFootballDataConfig()) {
    return {
      synced: false,
      count: 0,
      apiCalls: 0,
      error: "FOOTBALL_DATA_API_KEY manquante",
    };
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    return {
      synced: false,
      count: 0,
      apiCalls: 0,
      error: e instanceof Error ? e.message : "Admin client unavailable",
    };
  }

  let response;
  try {
    response = await fetchWcScorers();
  } catch (e) {
    return {
      synced: false,
      count: 0,
      apiCalls: 1,
      error: e instanceof Error ? e.message : "Échec football-data.org",
    };
  }

  const scorers = mapFootballDataScorers(response.scorers);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("tournament_config")
    .update({
      wc_scorers: scorers,
      wc_scorers_synced_at: now,
    })
    .eq("id", 1);

  if (error) {
    return {
      synced: false,
      count: 0,
      apiCalls: 1,
      error: error.message,
    };
  }

  return { synced: true, count: scorers.length, apiCalls: 1 };
}

async function readCachedScorers(): Promise<{
  scorers: TournamentScorer[];
  syncedAt: string | null;
}> {
  if (!hasSupabaseConfig) return { scorers: [], syncedAt: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_config")
    .select("wc_scorers, wc_scorers_synced_at")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return { scorers: [], syncedAt: null };

  const raw = data.wc_scorers;
  return {
    scorers: Array.isArray(raw) ? (raw as TournamentScorer[]) : [],
    syncedAt: (data.wc_scorers_synced_at as string | null) ?? null,
  };
}

export const getTournamentScorers = cache(async (): Promise<{
  scorers: TournamentScorer[];
  syncedAt: string | null;
}> => readCachedScorers());

export async function getTeamTournamentScorers(teamId: number): Promise<{
  scorers: TournamentScorer[];
  syncedAt: string | null;
  totalGoals: number;
}> {
  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("football_data_id")
    .eq("id", teamId)
    .maybeSingle();

  const { scorers, syncedAt } = await getTournamentScorers();
  const fdId = team?.football_data_id;
  if (fdId == null) {
    return { scorers: [], syncedAt, totalGoals: 0 };
  }

  const teamScorers = scorers.filter((s) => s.teamFootballDataId === fdId);
  const totalGoals = teamScorers.reduce((sum, s) => sum + s.goals, 0);

  return { scorers: teamScorers, syncedAt, totalGoals };
}

export async function getMatchTournamentScorersForTeams(
  homeTeamId: number,
  awayTeamId: number,
): Promise<{
  homeScorers: TournamentScorer[];
  awayScorers: TournamentScorer[];
  syncedAt: string | null;
}> {
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, football_data_id")
    .in("id", [homeTeamId, awayTeamId]);

  const fdByLocal = new Map(
    (teams ?? []).map((t) => [t.id as number, t.football_data_id as number | null]),
  );

  return getMatchTournamentScorers(
    fdByLocal.get(homeTeamId),
    fdByLocal.get(awayTeamId),
  );
}

async function getMatchTournamentScorers(
  homeFootballDataId: number | null | undefined,
  awayFootballDataId: number | null | undefined,
): Promise<{
  homeScorers: TournamentScorer[];
  awayScorers: TournamentScorer[];
  syncedAt: string | null;
}> {
  const { scorers, syncedAt } = await getTournamentScorers();
  const ids = new Set(
    [homeFootballDataId, awayFootballDataId].filter(
      (id): id is number => id != null,
    ),
  );

  const homeScorers = homeFootballDataId
    ? scorers.filter((s) => s.teamFootballDataId === homeFootballDataId)
    : [];
  const awayScorers = awayFootballDataId
    ? scorers.filter((s) => s.teamFootballDataId === awayFootballDataId)
    : [];

  if (!ids.size) {
    return { homeScorers: [], awayScorers: [], syncedAt };
  }

  return { homeScorers, awayScorers, syncedAt };
}

export async function shouldSyncTournamentScorers(options?: {
  hasLiveMatches?: boolean;
}): Promise<boolean> {
  if (!hasFootballDataConfig()) return false;

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return false;
  }

  const { data } = await supabase
    .from("tournament_config")
    .select("wc_scorers_synced_at")
    .eq("id", 1)
    .maybeSingle();

  const syncedAt = data?.wc_scorers_synced_at as string | null;
  if (!syncedAt) return true;

  const interval = options?.hasLiveMatches
    ? TOURNAMENT_SCORERS_SYNC_LIVE_MS
    : TOURNAMENT_SCORERS_SYNC_IDLE_MS;

  return Date.now() - new Date(syncedAt).getTime() >= interval;
}

export async function syncTournamentScorersIfDue(options?: {
  hasLiveMatches?: boolean;
}): Promise<SyncTournamentScorersResult> {
  const due = await shouldSyncTournamentScorers(options);
  if (!due) return { synced: false, count: 0, apiCalls: 0 };
  return syncTournamentScorersFromApi();
}
