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
  teams?: FootballDataWcTeamEntry[];
}

/** Entrée /competitions/WC/teams — inclut effectif et coach. */
export interface FootballDataWcTeamEntry extends FootballDataTeamRef {
  crest?: string | null;
  squad?: FootballDataSquadPerson[];
  coach?: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export interface FootballDataSquadPerson {
  id: number;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  shirtNumber?: number | null;
  role?: string | null;
}

export interface FootballDataTeamDetail {
  id: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
  founded?: number | null;
  venue?: string | null;
  squad?: FootballDataSquadPerson[];
  coach?: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export interface FootballDataScorerEntry {
  player: {
    id: number;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  team: FootballDataTeamRef & { crest?: string | null };
  goals: number;
  assists?: number | null;
  penalties?: number | null;
  playedMatches?: number | null;
}

export interface FootballDataScorersResponse {
  scorers?: FootballDataScorerEntry[];
}
