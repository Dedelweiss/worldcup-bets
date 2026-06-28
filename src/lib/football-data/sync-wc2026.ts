import { logAppEvent } from "@/lib/logging/app-logger";
import {
  fetchFootballDataMatchById,
  fetchWcMatches,
  fetchWcMatchesInWindow,
  fetchWcTeams,
  hasFootballDataConfig,
} from "@/lib/football-data/client";
import {
  FOOTBALL_DATA_MAX_ODDS_DETAIL_FETCHES,
  FOOTBALL_DATA_TEAMS_ENDPOINT_INTERVAL_MS,
} from "@/lib/football-data/rate-limit";
import { syncStaleTeamSquads } from "@/lib/football-data/sync-team-squads";
import { syncStaleMatchGoalEvents } from "@/lib/match-goals/sync-goal-events";
import { syncTournamentScorersIfDue } from "@/lib/football-data/sync-tournament-scorers";
import {
  mapFootballDataScoreToLocal,
  mapFootballDataStatus,
  parseFootballDataOdds,
  isFootballDataFinishedStatus,
  parseFootballDataScore,
  shouldApplyFootballDataStatus,
} from "@/lib/football-data/parse-match";
import {
  collectSidesFromMatches,
  footballDataSideMatchesOurCode,
  resolveFootballDataTeamId,
} from "@/lib/football-data/team-link";
import { propagateKnockoutAdvancement } from "@/lib/tournament/knockout-advancement";
import type {
  FootballDataMatch,
  FootballDataTeamRef,
} from "@/lib/football-data/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MatchStatus } from "@/types/database";

const KICKOFF_MATCH_WINDOW_MS = 3 * 60 * 60 * 1000;

let lastTeamsApiLinkAt = 0;

interface DbTeam {
  id: number;
  code: string | null;
  football_data_id: number | null;
}

interface DbMatch {
  id: number;
  home_team_id: number;
  away_team_id: number;
  kickoff_at: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  settled_at: string | null;
  suppress_auto_live: boolean | null;
  live_clock_manual: boolean | null;
  football_data_id: number | null;
}

export interface SyncFootballDataResult {
  ok: boolean;
  updated: number;
  oddsUpdated: number;
  settled: number;
  linkedTeams: number;
  linkedMatches: number;
  apiMatches: number;
  apiCalls: number;
  squadsSynced?: number;
  scorersSynced?: number;
  goalEventsSynced?: number;
  error?: string;
}

/** Retire les liaisons équipe incorrectes (ex. Japon ↔ Suède inversés). */
async function revalidateTeamLinks(
  supabase: ReturnType<typeof createAdminClient>,
  fdSides: FootballDataTeamRef[],
): Promise<number> {
  const fdById = new Map(fdSides.filter((s) => s.id).map((s) => [s.id!, s]));

  const { data: dbTeams } = await supabase
    .from("teams")
    .select("id, code, football_data_id")
    .not("tournament_group_id", "is", null)
    .not("football_data_id", "is", null);

  if (!dbTeams?.length) return 0;

  let cleared = 0;
  for (const team of dbTeams as DbTeam[]) {
    const side = fdById.get(team.football_data_id!);
    if (!side) continue;
    if (footballDataSideMatchesOurCode(side, team.code)) continue;

    const { error } = await supabase
      .from("teams")
      .update({ football_data_id: null, updated_at: new Date().toISOString() })
      .eq("id", team.id);

    if (!error) cleared++;
  }

  return cleared;
}

/** Lie les équipes à partir des matchs (0 requête API supplémentaire). */
async function linkTeamsFromMatchList(
  supabase: ReturnType<typeof createAdminClient>,
  fdList: FootballDataMatch[],
): Promise<number> {
  const { data: dbTeams } = await supabase
    .from("teams")
    .select("id, code, football_data_id")
    .not("tournament_group_id", "is", null);

  if (!dbTeams?.length) return 0;

  const unlinked = (dbTeams as DbTeam[]).filter((t) => !t.football_data_id);
  if (unlinked.length === 0) return 0;

  const sides = collectSidesFromMatches(fdList);

  let linked = 0;
  for (const team of unlinked) {
    const fdId = resolveFootballDataTeamId(team.code, sides);
    if (!fdId) continue;

    const { error } = await supabase
      .from("teams")
      .update({ football_data_id: fdId, updated_at: new Date().toISOString() })
      .eq("id", team.id);

    if (!error) linked++;
  }

  return linked;
}

async function countUnlinkedTournamentTeams(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<number> {
  const { count, error } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .not("tournament_group_id", "is", null)
    .is("football_data_id", null);

  if (error) return 0;
  return count ?? 0;
}

/** Endpoint /teams — 2ᵉ requête, rare (équipes encore sans ID externe). */
async function linkTeamsViaApi(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<number> {
  let apiTeams;
  try {
    apiTeams = await fetchWcTeams();
  } catch {
    return 0;
  }

  if (!apiTeams.teams?.length) return 0;

  const { data: dbTeams } = await supabase
    .from("teams")
    .select("id, code, football_data_id")
    .not("tournament_group_id", "is", null);

  if (!dbTeams?.length) return 0;

  let linked = 0;
  for (const team of dbTeams as DbTeam[]) {
    if (team.football_data_id) continue;
    const fdId = resolveFootballDataTeamId(team.code, apiTeams.teams);
    if (!fdId) continue;

    const { error } = await supabase
      .from("teams")
      .update({ football_data_id: fdId, updated_at: new Date().toISOString() })
      .eq("id", team.id);

    if (!error) linked++;
  }

  return linked;
}

interface InternalMatchLink {
  match: DbMatch;
  /** true si domicile/extérieur seed ≠ API (scores et cotes à inverser). */
  swapSides: boolean;
}

function pickBestByKickoff(
  candidates: DbMatch[],
  kickoffFd: number,
): DbMatch | null {
  if (candidates.length === 1) return candidates[0]!;

  let best: DbMatch | null = null;
  let bestDelta = Infinity;
  for (const m of candidates) {
    const delta = Math.abs(new Date(m.kickoff_at).getTime() - kickoffFd);
    if (delta < bestDelta && delta <= KICKOFF_MATCH_WINDOW_MS) {
      bestDelta = delta;
      best = m;
    }
  }
  return best;
}

function sidesSwappedForLocalMatch(
  fdMatch: FootballDataMatch,
  local: DbMatch,
  teamFdToLocal: Map<number, number>,
): boolean {
  const homeLocal = teamFdToLocal.get(fdMatch.homeTeam.id);
  const awayLocal = teamFdToLocal.get(fdMatch.awayTeam.id);
  if (homeLocal == null || awayLocal == null) return false;
  if (homeLocal === local.home_team_id && awayLocal === local.away_team_id) {
    return false;
  }
  if (homeLocal === local.away_team_id && awayLocal === local.home_team_id) {
    return true;
  }
  return false;
}

function findInternalMatch(
  fdMatch: FootballDataMatch,
  dbMatches: DbMatch[],
  teamFdToLocal: Map<number, number>,
): InternalMatchLink | null {
  const homeLocal = teamFdToLocal.get(fdMatch.homeTeam.id);
  const awayLocal = teamFdToLocal.get(fdMatch.awayTeam.id);
  if (homeLocal == null || awayLocal == null) return null;

  const kickoffFd = new Date(fdMatch.utcDate).getTime();

  const direct = dbMatches.filter(
    (m) => m.home_team_id === homeLocal && m.away_team_id === awayLocal,
  );
  const directPick = pickBestByKickoff(direct, kickoffFd);
  if (directPick) return { match: directPick, swapSides: false };

  const swapped = dbMatches.filter(
    (m) => m.home_team_id === awayLocal && m.away_team_id === homeLocal,
  );
  const swappedPick = pickBestByKickoff(swapped, kickoffFd);
  if (swappedPick) return { match: swappedPick, swapSides: true };

  return null;
}

async function loadFdMatches(
  options?: { force?: boolean },
): Promise<{ list: FootballDataMatch[]; apiCalls: number }> {
  let apiCalls = 0;
  const byId = new Map<number, FootballDataMatch>();

  const season = await fetchWcMatches();
  apiCalls += 1;
  for (const m of season.matches ?? []) {
    byId.set(m.id, m);
  }

  if (options?.force) {
    const from = new Date();
    from.setDate(from.getDate() - 3);
    const to = new Date();
    to.setDate(to.getDate() + 21);
    const window = await fetchWcMatchesInWindow(from, to);
    apiCalls += 1;
    for (const m of window.matches ?? []) {
      byId.set(m.id, m);
    }
  }

  return { list: [...byId.values()], apiCalls };
}

async function enrichOddsFromMatchDetails(
  fdById: Map<number, FootballDataMatch>,
  fdMatchIds: number[],
): Promise<number> {
  let extraCalls = 0;
  const needOdds = fdMatchIds.filter((id) => {
    const m = fdById.get(id);
    return m != null && !parseFootballDataOdds(m);
  });

  for (const id of needOdds.slice(0, FOOTBALL_DATA_MAX_ODDS_DETAIL_FETCHES)) {
    try {
      const detail = await fetchFootballDataMatchById(id);
      extraCalls += 1;
      if (detail.odds) {
        const prev = fdById.get(id);
        fdById.set(id, prev ? { ...prev, odds: detail.odds } : detail);
      }
    } catch {
      // ignore single match failure
    }
  }

  return extraCalls;
}

export async function syncFootballDataWc2026(options?: {
  force?: boolean;
  /** Cotes gérées par odds-api.io */
  skipOdds?: boolean;
}): Promise<SyncFootballDataResult> {
  const empty = {
    ok: false,
    updated: 0,
    oddsUpdated: 0,
    settled: 0,
    linkedTeams: 0,
    linkedMatches: 0,
    apiMatches: 0,
    apiCalls: 0,
  };

  if (!hasFootballDataConfig()) {
    return { ...empty, error: "FOOTBALL_DATA_API_KEY manquante" };
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    return {
      ...empty,
      error: e instanceof Error ? e.message : "Admin client unavailable",
    };
  }

  let apiCalls = 0;

  try {
    const { list: fdListRaw, apiCalls: loadCalls } = await loadFdMatches(options);
    apiCalls += loadCalls;

    const fdById = new Map(fdListRaw.map((m) => [m.id, m]));

    if (options?.force && !options.skipOdds) {
      apiCalls += await enrichOddsFromMatchDetails(
        fdById,
        fdListRaw.map((m) => m.id),
      );
    }

    const fdList = [...fdById.values()];
    const fdSides = collectSidesFromMatches(fdList);

    await revalidateTeamLinks(supabase, fdSides);

    let linkedTeams = await linkTeamsFromMatchList(supabase, fdList);

    const unlinked = await countUnlinkedTournamentTeams(supabase);
    const teamsEndpointDue =
      options?.force ||
      (unlinked > 0 &&
        Date.now() - lastTeamsApiLinkAt >= FOOTBALL_DATA_TEAMS_ENDPOINT_INTERVAL_MS);

    if (teamsEndpointDue && unlinked > 0) {
      linkedTeams += await linkTeamsViaApi(supabase);
      apiCalls += 1;
      lastTeamsApiLinkAt = Date.now();
    }

    const { data: teams } = await supabase
      .from("teams")
      .select("id, football_data_id")
      .not("football_data_id", "is", null);

    const teamFdToLocal = new Map<number, number>();
    for (const t of teams ?? []) {
      if (t.football_data_id != null) {
        teamFdToLocal.set(t.football_data_id, t.id);
      }
    }

    const { data: dbMatches } = await supabase
      .from("matches")
      .select(
        "id, home_team_id, away_team_id, kickoff_at, status, home_score, away_score, settled_at, suppress_auto_live, live_clock_manual, football_data_id",
      )
      .eq("season", 2026);

    const localMatches = (dbMatches ?? []) as DbMatch[];
    const byFdId = new Map(
      localMatches
        .filter((m) => m.football_data_id != null)
        .map((m) => [m.football_data_id!, m]),
    );

    let updated = 0;
    let oddsUpdated = 0;
    let settled = 0;
    let linkedMatches = 0;

    for (const fd of fdList) {
      const fromFdId = byFdId.get(fd.id);
      const linked = fromFdId
        ? {
            match: fromFdId,
            swapSides: sidesSwappedForLocalMatch(
              fd,
              fromFdId,
              teamFdToLocal,
            ),
          }
        : findInternalMatch(fd, localMatches, teamFdToLocal);

      if (!linked) continue;

      let local = linked.match;
      const swapSides = linked.swapSides;

      if (!local.football_data_id) {
        linkedMatches++;
        local = { ...local, football_data_id: fd.id };
        byFdId.set(fd.id, local);
      }

      if (local.settled_at) continue;

      const mappedStatus = mapFootballDataStatus(fd.status);
      const score = parseFootballDataScore(fd);
      const odds = options?.skipOdds ? null : parseFootballDataOdds(fd);

      const patch: Record<string, unknown> = {
        football_data_id: fd.id,
        kickoff_at: fd.utcDate,
        updated_at: new Date().toISOString(),
        raw_api_payload: fd,
      };

      if (fd.venue) patch.venue = fd.venue;

      const apiFinished = isFootballDataFinishedStatus(fd.status);
      if (apiFinished && local.status !== "finished") {
        // Terminé côté API : statut finished sans clôture / paiement des paris.
        patch.status = "finished";
      } else if (mappedStatus) {
        const suppress = Boolean(local.suppress_auto_live);
        if (shouldApplyFootballDataStatus(local.status, mappedStatus, suppress)) {
          patch.status = mappedStatus;
        }
      }

      if (score) {
        const mapped = mapFootballDataScoreToLocal(score, swapSides);
        patch.home_score = mapped.home_score;
        patch.away_score = mapped.away_score;
      } else if (
        mappedStatus === "scheduled" &&
        shouldApplyFootballDataStatus(local.status, "scheduled", Boolean(local.suppress_auto_live)) &&
        local.status !== "live" &&
        local.status !== "finished"
      ) {
        patch.home_score = null;
        patch.away_score = null;
      }

      const isLiveApi =
        fd.status === "IN_PLAY" || fd.status === "PAUSED";
      const clockManual = Boolean(local.live_clock_manual);
      if (!clockManual && isLiveApi && fd.minute != null) {
        patch.live_minute = fd.minute;
        patch.live_injury_time = fd.injuryTime ?? null;
      } else if (
        !clockManual &&
        (mappedStatus === "finished" || apiFinished)
      ) {
        patch.live_minute = null;
        patch.live_injury_time = null;
        patch.live_clock_anchor_at = null;
        patch.live_clock_manual = false;
      } else if (
        !clockManual &&
        mappedStatus === "scheduled" &&
        shouldApplyFootballDataStatus(
          local.status,
          "scheduled",
          Boolean(local.suppress_auto_live),
        )
      ) {
        patch.live_minute = null;
        patch.live_injury_time = null;
        patch.live_clock_anchor_at = null;
        patch.live_clock_manual = false;
      }

      if (odds) {
        patch.odd_home = swapSides ? odds.away : odds.home;
        patch.odd_draw = odds.draw;
        patch.odd_away = swapSides ? odds.home : odds.away;
        patch.odds_synced_at = new Date().toISOString();
        oddsUpdated += 1;
      }

      const { error } = await supabase
        .from("matches")
        .update(patch)
        .eq("id", local.id);

      if (!error) {
        updated++;

        const nextHome =
          patch.home_score !== undefined
            ? (patch.home_score as number | null)
            : local.home_score;
        const nextAway =
          patch.away_score !== undefined
            ? (patch.away_score as number | null)
            : local.away_score;
        const willBeFinished =
          patch.status === "finished" ||
          local.status === "finished" ||
          apiFinished;

        if (
          willBeFinished &&
          nextHome != null &&
          nextAway != null &&
          !local.settled_at
        ) {
          const { data: settleData, error: settleError } = await supabase.rpc(
            "auto_settle_match",
            { p_match_id: local.id },
          );

          if (settleError) {
            logAppEvent({
              level: "warn",
              source: "sync.football-data",
              message: `Auto-settle failed for match ${local.id}`,
              metadata: { matchId: local.id, error: settleError.message },
            });
          } else if (
            settleData &&
            typeof settleData === "object" &&
            "ok" in settleData &&
            (settleData as { ok: boolean }).ok
          ) {
            settled += 1;
            try {
              await propagateKnockoutAdvancement(supabase, local.id);
            } catch (advanceError) {
              logAppEvent({
                level: "warn",
                source: "sync.football-data",
                message: `Knockout advancement failed for match ${local.id}`,
                metadata: {
                  matchId: local.id,
                  error:
                    advanceError instanceof Error
                      ? advanceError.message
                      : "unknown",
                },
              });
            }
          }
        }
      }
    }

    logAppEvent({
      level: "info",
      source: "sync.football-data",
      message: `Sync football-data OK (${updated} match(s), ${oddsUpdated} cote(s), ${settled} clôture(s))`,
      metadata: {
        updated,
        oddsUpdated,
        settled,
        linkedTeams,
        linkedMatches,
        apiMatches: fdList.length,
        apiCalls,
      },
    });

    const squadResult = await syncStaleTeamSquads();
    apiCalls += squadResult.apiCalls;

    const hasLive = fdList.some(
      (m) => m.status === "IN_PLAY" || m.status === "PAUSED",
    );
    const scorersResult = await syncTournamentScorersIfDue({
      hasLiveMatches: hasLive,
    });
    apiCalls += scorersResult.apiCalls;

    const goalEventsResult = await syncStaleMatchGoalEvents();
    apiCalls += goalEventsResult.apiCalls;

    return {
      ok: true,
      updated,
      oddsUpdated,
      settled,
      linkedTeams,
      linkedMatches,
      apiMatches: fdList.length,
      apiCalls,
      squadsSynced: squadResult.synced,
      scorersSynced: scorersResult.synced ? scorersResult.count : 0,
      goalEventsSynced: goalEventsResult.synced,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    logAppEvent({
      level: "error",
      source: "sync.football-data",
      message,
    });
    return {
      ...empty,
      error: message,
    };
  }
}
