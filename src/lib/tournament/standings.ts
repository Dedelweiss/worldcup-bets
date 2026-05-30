import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/auth-server";
import { normalizeMatch, MATCH_SELECT } from "@/lib/matches";
import type { MatchWithTeams, TournamentGroup, TournamentTeam } from "@/types/database";

export interface GroupStandingRow {
  team: Pick<TournamentTeam, "id" | "name" | "code" | "logo_url" | "group_position">;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface GroupStandings {
  group: TournamentGroup;
  rows: GroupStandingRow[];
}

type TeamStats = Omit<GroupStandingRow, "team">;

function emptyStats(): TeamStats {
  return {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
  };
}

function applyResult(
  stats: TeamStats,
  goalsFor: number,
  goalsAgainst: number,
): TeamStats {
  const next = { ...stats };
  next.played += 1;
  next.goalsFor += goalsFor;
  next.goalsAgainst += goalsAgainst;
  next.goalDiff = next.goalsFor - next.goalsAgainst;

  if (goalsFor > goalsAgainst) {
    next.won += 1;
    next.points += 3;
  } else if (goalsFor < goalsAgainst) {
    next.lost += 1;
  } else {
    next.drawn += 1;
    next.points += 1;
  }

  return next;
}

function sortRows(rows: GroupStandingRow[]): GroupStandingRow[] {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return (a.team.group_position ?? 99) - (b.team.group_position ?? 99);
  });
}

export function computeGroupStandings(
  group: TournamentGroup,
  teams: TournamentTeam[],
  matches: MatchWithTeams[],
): GroupStandings {
  const teamIds = new Set(teams.map((t) => t.id));
  const statsMap = new Map<number, TeamStats>();

  for (const team of teams) {
    statsMap.set(team.id, emptyStats());
  }

  for (const match of matches) {
    if (match.status !== "finished") continue;
    if (match.home_score === null || match.away_score === null) continue;
    if (!teamIds.has(match.home_team.id) || !teamIds.has(match.away_team.id)) {
      continue;
    }

    const home = statsMap.get(match.home_team.id)!;
    const away = statsMap.get(match.away_team.id)!;
    statsMap.set(
      match.home_team.id,
      applyResult(home, match.home_score, match.away_score),
    );
    statsMap.set(
      match.away_team.id,
      applyResult(away, match.away_score, match.home_score),
    );
  }

  const rows: GroupStandingRow[] = teams.map((team) => ({
    team: {
      id: team.id,
      name: team.name,
      code: team.code,
      logo_url: team.logo_url,
      group_position: team.group_position,
    },
    ...statsMap.get(team.id)!,
  }));

  return { group, rows: sortRows(rows) };
}

export async function getAllGroupStandings(): Promise<GroupStandings[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("tournament_groups")
    .select("id, letter, name")
    .order("id");

  if (!groups?.length) return [];

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, code, logo_url, tournament_group_id, group_position")
    .not("tournament_group_id", "is", null)
    .order("tournament_group_id")
    .order("group_position");

  const { data: matchesRaw } = await supabase
    .from("matches")
    .select(
      `
      ${MATCH_SELECT},
      stage, tournament_group_id, status
    `,
    )
    .eq("stage", "group")
    .eq("status", "finished");

  const matches = (matchesRaw ?? []).map((row) => normalizeMatch(row));

  return (groups as TournamentGroup[]).map((group) => {
    const groupTeams = (teams ?? []).filter(
      (t) => t.tournament_group_id === group.id,
    ) as TournamentTeam[];
    const groupMatches = matches.filter(
      (m) => m.tournament_group_id === group.id,
    );
    return computeGroupStandings(group, groupTeams, groupMatches);
  });
}
