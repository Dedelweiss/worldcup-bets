export interface FootballDataTeamRef {
  id: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
}

export interface FootballDataScorePart {
  home: number | null;
  away: number | null;
}

export interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | null;
  injuryTime?: number | null;
  venue?: string | null;
  homeTeam: FootballDataTeamRef;
  awayTeam: FootballDataTeamRef;
  score?: {
    winner?: string | null;
    fullTime?: FootballDataScorePart | null;
    halfTime?: FootballDataScorePart | null;
    regularTime?: FootballDataScorePart | null;
  } | null;
  goals?: Array<{
    score?: FootballDataScorePart | null;
  }> | null;
  odds?: {
    homeWin?: number | null;
    draw?: number | null;
    awayWin?: number | null;
  } | null;
}

export interface FootballDataCompetitionMatchesResponse {
  matches?: FootballDataMatch[];
}

export interface FootballDataCompetitionTeamsResponse {
  teams?: (FootballDataTeamRef & { crest?: string | null })[];
}
