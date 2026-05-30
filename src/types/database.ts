export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type BetType = "match_result" | "exact_score" | "goalscorer";

export type MatchResultSelection = "home" | "draw" | "away";

export type BetStatus = "pending" | "won" | "lost" | "void" | "cancelled";

export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  balance: number;
  role?: UserRole;
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
  isDemo?: boolean;
}

export interface BetRow {
  id: string;
  match_id: number;
  bet_type: BetType;
  selection: { selection?: MatchResultSelection };
  odd_at_placement: number;
  stake: number;
  potential_payout: number;
  status: BetStatus;
  placed_at: string;
  match: Pick<
    MatchWithTeams,
    "id" | "round" | "status" | "kickoff_at" | "home_team" | "away_team"
  >;
}
