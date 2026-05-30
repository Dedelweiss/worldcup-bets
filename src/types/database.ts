export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type BetType = "match_result" | "exact_score" | "goalscorer";

export type BetStatus = "pending" | "won" | "lost" | "void" | "cancelled";

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  balance: number;
}

export interface Team {
  id: number;
  name: string;
  code: string | null;
  logo_url: string | null;
}

export interface MatchWithTeams {
  id: number;
  round: string | null;
  status: MatchStatus;
  kickoff_at: string;
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
  odd_home: number | null;
  odd_draw: number | null;
  odd_away: number | null;
  home_team: Team;
  away_team: Team;
}

export interface DashboardData {
  profile: Profile;
  upcomingMatches: MatchWithTeams[];
}
