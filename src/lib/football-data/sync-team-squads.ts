import {
  fetchFootballDataTeamById,
  fetchWcTeams,
  hasFootballDataConfig,
} from "@/lib/football-data/client";
import { resolveFootballDataTeamId } from "@/lib/football-data/team-link";
import {
  FOOTBALL_DATA_MAX_SQUAD_SYNCS_PER_RUN,
  FOOTBALL_DATA_SQUAD_SYNC_INTERVAL_MS,
} from "@/lib/football-data/rate-limit";
import type {
  FootballDataSquadPerson,
  FootballDataWcTeamEntry,
} from "@/lib/football-data/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TeamSquadPlayer } from "@/types/database";

interface DbTeamForSquad {
  id: number;
  code: string | null;
  football_data_id: number | null;
  squad_synced_at: string | null;
}

function personDisplayName(person: FootballDataSquadPerson): string {
  if (person.name?.trim()) return person.name.trim();
  return [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
}

function coachDisplayName(
  coach: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null
    | undefined,
): string | null {
  if (!coach) return null;
  if (coach.name?.trim()) return coach.name.trim();
  const joined = [coach.firstName, coach.lastName].filter(Boolean).join(" ").trim();
  return joined || null;
}

export function mapFootballDataSquad(
  squad: FootballDataSquadPerson[] | undefined,
): TeamSquadPlayer[] {
  if (!squad?.length) return [];

  return squad
    .filter((p) => p.role !== "COACH")
    .map((p) => ({
      id: p.id,
      name: personDisplayName(p),
      position: p.position?.trim() || null,
      shirtNumber: p.shirtNumber ?? null,
      dateOfBirth: p.dateOfBirth?.slice(0, 10) ?? null,
      nationality: p.nationality?.trim() || null,
    }))
    .filter((p) => p.name.length > 0)
    .sort((a, b) => {
      const na = a.shirtNumber ?? 999;
      const nb = b.shirtNumber ?? 999;
      if (na !== nb) return na - nb;
      return a.name.localeCompare(b.name, "fr");
    });
}

function isSquadStale(syncedAt: string | null): boolean {
  if (!syncedAt) return true;
  const age = Date.now() - new Date(syncedAt).getTime();
  return age >= FOOTBALL_DATA_SQUAD_SYNC_INTERVAL_MS;
}

function wcEntryForTeam(
  team: DbTeamForSquad,
  byFdId: Map<number, FootballDataWcTeamEntry>,
  wcTeams: FootballDataWcTeamEntry[],
): FootballDataWcTeamEntry | null {
  if (team.football_data_id != null) {
    return byFdId.get(team.football_data_id) ?? null;
  }
  const fdId = resolveFootballDataTeamId(team.code, wcTeams);
  return fdId != null ? (byFdId.get(fdId) ?? null) : null;
}

export interface TeamSquadSyncStatus {
  tournamentTeams: number;
  linkedToApi: number;
  withSquad: number;
  pending: number;
}

export async function getTeamSquadSyncStatus(): Promise<TeamSquadSyncStatus> {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { tournamentTeams: 0, linkedToApi: 0, withSquad: 0, pending: 0 };
  }

  const { data: teams, error } = await supabase
    .from("teams")
    .select("football_data_id, squad, squad_synced_at")
    .not("tournament_group_id", "is", null);

  if (error || !teams?.length) {
    return { tournamentTeams: 0, linkedToApi: 0, withSquad: 0, pending: 0 };
  }

  const tournamentTeams = teams.length;
  const linkedToApi = teams.filter((t) => t.football_data_id != null).length;
  const withSquad = teams.filter(
    (t) => Array.isArray(t.squad) && t.squad.length > 0,
  ).length;
  const pending = teams.filter(
    (t) =>
      t.football_data_id != null &&
      (!Array.isArray(t.squad) || t.squad.length === 0),
  ).length;

  return { tournamentTeams, linkedToApi, withSquad, pending };
}

export type SyncTeamSquadsResult = {
  synced: number;
  apiCalls: number;
  remaining: number;
  error?: string;
};

/**
 * Importe tous les effectifs en 1 requête (/competitions/WC/teams).
 * C'est la méthode utilisée par le bouton admin.
 */
export async function syncTeamSquadsFromCompetition(): Promise<SyncTeamSquadsResult> {
  if (!hasFootballDataConfig()) {
    return {
      synced: 0,
      apiCalls: 0,
      remaining: 0,
      error: "FOOTBALL_DATA_API_KEY manquante",
    };
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    return {
      synced: 0,
      apiCalls: 0,
      remaining: 0,
      error: e instanceof Error ? e.message : "Admin client unavailable",
    };
  }

  let wcTeams: FootballDataWcTeamEntry[];
  try {
    const response = await fetchWcTeams();
    wcTeams = (response.teams ?? []) as FootballDataWcTeamEntry[];
  } catch (e) {
    return {
      synced: 0,
      apiCalls: 1,
      remaining: 0,
      error: e instanceof Error ? e.message : "Échec football-data.org",
    };
  }

  if (!wcTeams.length) {
    return {
      synced: 0,
      apiCalls: 1,
      remaining: 0,
      error: "Aucune équipe renvoyée par football-data.org pour la CDM 2026.",
    };
  }

  const byFdId = new Map(wcTeams.filter((t) => t.id).map((t) => [t.id, t]));

  const { data: dbTeams, error } = await supabase
    .from("teams")
    .select("id, code, football_data_id, squad_synced_at, squad")
    .not("tournament_group_id", "is", null);

  if (error || !dbTeams?.length) {
    return { synced: 0, apiCalls: 1, remaining: 0, error: error?.message };
  }

  const now = new Date().toISOString();
  let synced = 0;

  for (const team of dbTeams as (DbTeamForSquad & { squad: unknown })[]) {
    const entry = wcEntryForTeam(team, byFdId, wcTeams);
    if (!entry) continue;

    const squad = mapFootballDataSquad(entry.squad);
    const coachName = coachDisplayName(entry.coach);
    const patch: Record<string, unknown> = {
      squad_synced_at: now,
      updated_at: now,
      coach_name: coachName,
    };

    if (squad.length > 0) {
      patch.squad = squad;
    }

    if (team.football_data_id == null && entry.id) {
      patch.football_data_id = entry.id;
    }

    const { error: updateError } = await supabase
      .from("teams")
      .update(patch)
      .eq("id", team.id);

    if (!updateError && squad.length > 0) synced += 1;
  }

  const status = await getTeamSquadSyncStatus();

  return {
    synced,
    apiCalls: 1,
    remaining: status.pending,
  };
}

/** Cron : bulk si des effectifs manquent, sinon 1 resync stale au plus. */
export async function syncStaleTeamSquads(options?: {
  maxTeams?: number;
  force?: boolean;
}): Promise<SyncTeamSquadsResult> {
  const status = await getTeamSquadSyncStatus();
  if (status.pending > 0) {
    return syncTeamSquadsFromCompetition();
  }

  const maxTeams = options?.maxTeams ?? FOOTBALL_DATA_MAX_SQUAD_SYNCS_PER_RUN;
  if (!hasFootballDataConfig() || maxTeams <= 0) {
    return { synced: 0, apiCalls: 0, remaining: 0 };
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    return {
      synced: 0,
      apiCalls: 0,
      remaining: 0,
      error: e instanceof Error ? e.message : "Admin client unavailable",
    };
  }

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, football_data_id, squad_synced_at, squad")
    .not("tournament_group_id", "is", null)
    .not("football_data_id", "is", null)
    .order("squad_synced_at", { ascending: true, nullsFirst: true });

  if (error || !teams?.length) {
    return { synced: 0, apiCalls: 0, remaining: 0, error: error?.message };
  }

  const stale = (teams as (DbTeamForSquad & { squad: unknown })[]).filter((t) => {
    const hasSquad = Array.isArray(t.squad) && t.squad.length > 0;
    if (!hasSquad) return true;
    return isSquadStale(t.squad_synced_at);
  });

  if (!stale.length) {
    return { synced: 0, apiCalls: 0, remaining: 0 };
  }

  let synced = 0;
  let apiCalls = 0;

  for (const team of stale.slice(0, maxTeams)) {
    if (!team.football_data_id) continue;
    try {
      const detail = await fetchFootballDataTeamById(team.football_data_id);
      apiCalls += 1;

      const squad = mapFootballDataSquad(detail.squad);
      const coachName = coachDisplayName(detail.coach);

      const { error: updateError } = await supabase
        .from("teams")
        .update({
          squad: squad.length > 0 ? squad : null,
          coach_name: coachName,
          squad_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", team.id);

      if (!updateError && squad.length > 0) synced += 1;
    } catch {
      // ignore single team failure
    }
  }

  return {
    synced,
    apiCalls,
    remaining: Math.max(0, stale.length - synced),
  };
}

/** Import admin : tous les effectifs en 1 clic (1 req API). */
export async function syncTeamSquadsAdminBatch(): Promise<SyncTeamSquadsResult> {
  return syncTeamSquadsFromCompetition();
}
