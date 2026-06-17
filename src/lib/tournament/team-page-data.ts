import { getTeamTournamentScorers } from "@/lib/football-data/sync-tournament-scorers";
import {
  getTeamGroupStanding,
  getTeamMatches,
  getTournamentTeamById,
} from "@/lib/tournament/team-queries";
import type { GroupStandingRow } from "@/lib/tournament/standings";
import type { MatchWithTeams, TournamentTeamDetail } from "@/types/database";

export interface TeamPageData {
  team: TournamentTeamDetail;
  standing: {
    row: GroupStandingRow;
    rank: number;
    groupName: string;
  } | null;
  upcomingMatches: MatchWithTeams[];
  finishedMatches: MatchWithTeams[];
  liveMatches: MatchWithTeams[];
  tournamentScorers: Awaited<ReturnType<typeof getTeamTournamentScorers>>;
}

export async function getTeamPageData(
  teamId: number,
): Promise<TeamPageData | null> {
  const team = await getTournamentTeamById(teamId);
  if (!team) return null;

  const [matches, standingResult, tournamentScorers] = await Promise.all([
    getTeamMatches(teamId),
    getTeamGroupStanding(team),
    getTeamTournamentScorers(teamId),
  ]);

  const upcomingMatches = matches.filter((m) => m.status === "scheduled");
  const liveMatches = matches.filter((m) => m.status === "live");
  const finishedMatches = matches
    .filter((m) => m.status === "finished")
    .reverse();

  return {
    team,
    standing: standingResult
      ? {
          row: standingResult.row,
          rank: standingResult.rank,
          groupName: standingResult.standings.group.name,
        }
      : null,
    upcomingMatches,
    finishedMatches,
    liveMatches,
    tournamentScorers,
  };
}
