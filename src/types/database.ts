export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type BetType =
  | "match_result"
  | "exact_score"
  | "goalscorer"
  | "fun";

export type MatchResultSelection = "home" | "draw" | "away";

export type FunOutcome = "yes" | "no";

export type FunMarketStatus = "open" | "closed" | "settled";

export type BetStatus = "pending" | "won" | "lost" | "void" | "cancelled";

export type UserRole = "user" | "admin";

export type MatchStage =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third_place"
  | "final";

export interface TournamentGroup {
  id: number;
  letter: string;
  name: string;
}

export interface TournamentTeam extends Team {
  tournament_group_id: number | null;
  group_position: number | null;
  tournament_group?: TournamentGroup | null;
}

export interface BracketSlotWithMatch {
  id: string;
  stage: MatchStage;
  label: string;
  bracket_order: number;
  match_id: number | null;
  match: MatchWithTeams | null;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  /** Total de points (ex-colonne balance). */
  points: number;
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
  stage?: MatchStage;
  kickoff_at: string;
  venue: string | null;
  tournament_group_id?: number | null;
  tournament_group?: TournamentGroup | null;
  bet_scope_note?: string | null;
  home_score: number | null;
  away_score: number | null;
  odd_home: number | null;
  odd_draw: number | null;
  odd_away: number | null;
  home_team: Team;
  away_team: Team;
}

export interface FunMarket {
  id: string;
  match_id: number;
  question: string;
  odd_yes: number;
  odd_no: number;
  status: FunMarketStatus;
  winning_outcome: FunOutcome | null;
  created_at: string;
}

export interface DashboardData {
  profile: Profile;
  upcomingMatches: MatchWithTeams[];
  isDemo?: boolean;
}

export type LeaderboardSort = "points" | "classic_won" | "fun_won";

export type LeaderboardScope = "general" | "league";

export interface League {
  id: string;
  name: string;
  slug: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface LeagueWithMemberCount extends League {
  member_count: number;
}

export interface LeaderboardLeagueTag {
  id: string;
  name: string;
}

export interface LeaderboardEntry {
  id: string;
  display_name: string | null;
  username: string | null;
  /** Points totaux (RPC renvoie encore la colonne `balance`). */
  balance: number;
  classic_won: number;
  classic_lost: number;
  fun_won: number;
  fun_lost: number;
  total_won: number;
  total_lost: number;
  leagues?: LeaderboardLeagueTag[];
}

export interface BetRow {
  id: string;
  match_id: number;
  market_id: string | null;
  bet_type: BetType;
  selection: {
    selection?: MatchResultSelection;
    outcome?: FunOutcome;
    fun_market_id?: string;
  };
  odd_at_placement: number;
  stake: number;
  potential_payout: number;
  status: BetStatus;
  placed_at: string;
  match: Pick<
    MatchWithTeams,
    "id" | "round" | "status" | "kickoff_at" | "home_team" | "away_team"
  >;
  fun_market?: Pick<FunMarket, "id" | "question"> | null;
}
