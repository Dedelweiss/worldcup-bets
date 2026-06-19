import {
  fetchNativeStatsMatchHtml,
  parseNativeStatsMatchGoals,
} from "@/lib/match-goals/parse-native-stats";
import {
  fetchWikipediaGroupWikitext,
  findWikipediaMatchGoals,
} from "@/lib/match-goals/parse-wikipedia";
import {
  GOAL_EVENTS_SYNC_FINISHED_MS,
  GOAL_EVENTS_SYNC_LIVE_MS,
  MAX_GOAL_EVENTS_SYNCS_ADMIN,
  MAX_GOAL_EVENTS_SYNCS_PER_CRON,
} from "@/lib/match-goals/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  MatchGoalEvent,
  MatchGoalEventsSource,
  MatchStatus,
} from "@/types/database";

interface MatchSyncRow {
  id: number;
  football_data_id: number;
  kickoff_at: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  goal_events_synced_at: string | null;
  home_team: { name: string; code: string | null };
  away_team: { name: string; code: string | null };
  tournament_group: { letter: string } | { letter: string }[] | null;
}

export type SyncGoalEventsResult = {
  synced: number;
  skipped: number;
  errors: number;
  apiCalls: number;
};

const MATCH_SYNC_SELECT = `
  id, football_data_id, kickoff_at, status, home_score, away_score, goal_events_synced_at,
  home_team:teams!matches_home_team_id_fkey (name, code),
  away_team:teams!matches_away_team_id_fkey (name, code),
  tournament_group:tournament_groups (letter)
`;

function normalizeGroup(
  group: MatchSyncRow["tournament_group"],
): { letter: string } | null {
  if (!group) return null;
  if (Array.isArray(group)) return group[0] ?? null;
  return group;
}

function normalizeTeam(
  raw: unknown,
): { name: string; code: string | null } | null {
  const team = Array.isArray(raw) ? raw[0] : raw;
  if (typeof team !== "object" || team === null) return null;
  const t = team as Record<string, unknown>;
  if (typeof t.name !== "string") return null;
  return {
    name: t.name,
    code: typeof t.code === "string" ? t.code : null,
  };
}

function normalizeMatchSyncRow(row: unknown): MatchSyncRow | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;

  if (typeof r.id !== "number" || typeof r.football_data_id !== "number") {
    return null;
  }

  const home_team = normalizeTeam(r.home_team);
  const away_team = normalizeTeam(r.away_team);
  if (!home_team || !away_team) return null;

  return {
    id: r.id,
    football_data_id: r.football_data_id,
    kickoff_at: typeof r.kickoff_at === "string" ? r.kickoff_at : "",
    status: r.status as MatchStatus,
    home_score: typeof r.home_score === "number" ? r.home_score : null,
    away_score: typeof r.away_score === "number" ? r.away_score : null,
    goal_events_synced_at:
      typeof r.goal_events_synced_at === "string"
        ? r.goal_events_synced_at
        : null,
    home_team,
    away_team,
    tournament_group: r.tournament_group as MatchSyncRow["tournament_group"],
  };
}

function totalGoals(match: MatchSyncRow): number {
  return (match.home_score ?? 0) + (match.away_score ?? 0);
}

function isSyncDue(match: MatchSyncRow): boolean {
  if (!match.goal_events_synced_at) return true;
  const interval =
    match.status === "live"
      ? GOAL_EVENTS_SYNC_LIVE_MS
      : GOAL_EVENTS_SYNC_FINISHED_MS;
  return Date.now() - new Date(match.goal_events_synced_at).getTime() >= interval;
}

async function resolveGoalEvents(
  match: MatchSyncRow,
  wikiCache: Map<string, string | null>,
): Promise<{
  events: MatchGoalEvent[];
  source: MatchGoalEventsSource;
  apiCalls: number;
} | null> {
  let apiCalls = 0;

  const html = await fetchNativeStatsMatchHtml(match.football_data_id);
  apiCalls += 1;

  if (html) {
    const events = parseNativeStatsMatchGoals(
      html,
      { name: match.home_team.name, code: match.home_team.code },
      { name: match.away_team.name, code: match.away_team.code },
    );
    if (events.length > 0) {
      return { events, source: "native-stats", apiCalls };
    }
    if (totalGoals(match) === 0 && match.status === "finished") {
      return { events: [], source: "native-stats", apiCalls };
    }
  }

  const groupLetter = normalizeGroup(match.tournament_group)?.letter;
  if (!groupLetter) {
    return totalGoals(match) === 0 && match.status === "finished"
      ? { events: [], source: "native-stats", apiCalls }
      : null;
  }

  let wikitext = wikiCache.get(groupLetter);
  if (wikitext === undefined) {
    wikitext = await fetchWikipediaGroupWikitext(groupLetter);
    apiCalls += 1;
    wikiCache.set(groupLetter, wikitext);
  }

  if (wikitext) {
    const events = findWikipediaMatchGoals(wikitext, {
      homeCode: match.home_team.code,
      awayCode: match.away_team.code,
      homeName: match.home_team.name,
      awayName: match.away_team.name,
      kickoffDate: match.kickoff_at,
    });
    if (events.length > 0) {
      return { events, source: "wikipedia", apiCalls };
    }
  }

  if (totalGoals(match) === 0 && match.status === "finished") {
    return { events: [], source: "wikipedia", apiCalls };
  }

  return null;
}

async function loadMatchesNeedingSync(): Promise<MatchSyncRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SYNC_SELECT)
    .eq("season", 2026)
    .in("status", ["live", "finished"])
    .not("football_data_id", "is", null)
    .order("kickoff_at", { ascending: false });

  if (error || !data) return [];

  return data
    .map(normalizeMatchSyncRow)
    .filter((m): m is MatchSyncRow => m !== null)
    .filter(isSyncDue);
}

export async function syncStaleMatchGoalEvents(options?: {
  maxMatches?: number;
}): Promise<SyncGoalEventsResult> {
  const maxMatches = options?.maxMatches ?? MAX_GOAL_EVENTS_SYNCS_PER_CRON;
  const result: SyncGoalEventsResult = {
    synced: 0,
    skipped: 0,
    errors: 0,
    apiCalls: 0,
  };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return result;
  }

  const candidates = await loadMatchesNeedingSync();
  const wikiCache = new Map<string, string | null>();
  const now = new Date().toISOString();

  for (const match of candidates.slice(0, maxMatches)) {
    try {
      const resolved = await resolveGoalEvents(match, wikiCache);
      result.apiCalls += resolved?.apiCalls ?? 1;

      if (!resolved) {
        await supabase
          .from("matches")
          .update({ goal_events_synced_at: now })
          .eq("id", match.id);
        result.skipped += 1;
        continue;
      }

      const { error } = await supabase
        .from("matches")
        .update({
          goal_events: resolved.events,
          goal_events_source: resolved.source,
          goal_events_synced_at: now,
        })
        .eq("id", match.id);

      if (error) {
        result.errors += 1;
      } else {
        result.synced += 1;
      }
    } catch {
      result.errors += 1;
    }
  }

  return result;
}

export async function syncMatchGoalEventsAdminBatch(): Promise<SyncGoalEventsResult> {
  return syncStaleMatchGoalEvents({ maxMatches: MAX_GOAL_EVENTS_SYNCS_ADMIN });
}

export function getMatchGoalEventsFromCache(
  match: Pick<
    import("@/types/database").MatchWithTeams,
    "goal_events" | "goal_events_synced_at" | "goal_events_source"
  >,
): {
  events: MatchGoalEvent[];
  syncedAt: string | null;
  source: MatchGoalEventsSource | null;
} {
  const raw = match.goal_events;
  return {
    events: Array.isArray(raw) ? raw : [],
    syncedAt: match.goal_events_synced_at ?? null,
    source: match.goal_events_source ?? null,
  };
}
