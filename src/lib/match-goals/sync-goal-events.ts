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

  return (data as unknown as MatchSyncRow[]).filter(isSyncDue);
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
