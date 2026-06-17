import { cache } from "react";
import { hasSupabaseConfig } from "@/lib/auth-server";
import { normalizeMatch, MATCH_SELECT } from "@/lib/matches";
import { createClient } from "@/lib/supabase/server";
import {
  computeGroupStandings,
  type GroupStandingRow,
  type GroupStandings,
} from "@/lib/tournament/standings";
import type {
  MatchWithTeams,
  TeamSquadPlayer,
  TournamentGroup,
  TournamentTeam,
  TournamentTeamDetail,
} from "@/types/database";

const TEAM_DETAIL_SELECT =
  "id, name, code, logo_url, tournament_group_id, group_position, coach_name, squad, squad_synced_at, tournament_group:tournament_groups (id, letter, name)" as const;

function mapTournamentTeamDetail(row: unknown): TournamentTeamDetail | null {
  if (!row) return null;
  const r = row as Record<string, unknown>;
  const g = r.tournament_group;
  const squadRaw = r.squad;

  return {
    id: r.id as number,
    name: r.name as string,
    code: (r.code as string | null) ?? null,
    logo_url: (r.logo_url as string | null) ?? null,
    tournament_group_id: (r.tournament_group_id as number | null) ?? null,
    group_position: (r.group_position as number | null) ?? null,
    coach_name: (r.coach_name as string | null) ?? null,
    squad_synced_at: (r.squad_synced_at as string | null) ?? null,
    squad: Array.isArray(squadRaw) ? (squadRaw as TeamSquadPlayer[]) : null,
    tournament_group: Array.isArray(g) ? g[0] : g,
  } as TournamentTeamDetail;
}

export const getTournamentTeamById = cache(
  async (id: number): Promise<TournamentTeamDetail | null> => {
    if (!hasSupabaseConfig) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("teams")
      .select(TEAM_DETAIL_SELECT)
      .eq("id", id)
      .not("tournament_group_id", "is", null)
      .maybeSingle();

    if (error || !data) return null;
    return mapTournamentTeamDetail(data);
  },
);

export async function getTeamMatches(
  teamId: number,
): Promise<MatchWithTeams[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      ${MATCH_SELECT},
      stage,
      tournament_group_id,
      bet_scope_note,
      tournament_group:tournament_groups (id, letter, name)
    `,
    )
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order("kickoff_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const m = normalizeMatch(row) as MatchWithTeams & Record<string, unknown>;
    const g = m.tournament_group;
    return {
      ...m,
      stage: (row as { stage: MatchWithTeams["stage"] }).stage ?? "group",
      tournament_group_id:
        (row as { tournament_group_id: number | null }).tournament_group_id ??
        null,
      bet_scope_note:
        (row as { bet_scope_note: string | null }).bet_scope_note ?? null,
      tournament_group: Array.isArray(g) ? g[0] : g,
    } as MatchWithTeams;
  });
}

export async function getTeamGroupStanding(
  team: TournamentTeam,
): Promise<{ standings: GroupStandings; row: GroupStandingRow; rank: number } | null> {
  if (!team.tournament_group_id || !team.tournament_group) return null;
  if (!hasSupabaseConfig) return null;

  const supabase = await createClient();
  const group = team.tournament_group as TournamentGroup;

  const [{ data: teams }, { data: matchesRaw }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, code, logo_url, tournament_group_id, group_position")
      .eq("tournament_group_id", group.id)
      .order("group_position"),
    supabase
      .from("matches")
      .select(`${MATCH_SELECT}, stage, tournament_group_id, status`)
      .eq("stage", "group")
      .eq("tournament_group_id", group.id)
      .eq("status", "finished"),
  ]);

  const groupTeams = (teams ?? []) as TournamentTeam[];
  const matches = (matchesRaw ?? []).map((row) => normalizeMatch(row));
  const standings = computeGroupStandings(group, groupTeams, matches);

  const rank =
    standings.rows.findIndex((r) => r.team.id === team.id) + 1;
  const row = standings.rows.find((r) => r.team.id === team.id);

  if (!row || rank < 1) return null;
  return { standings, row, rank };
}
