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

/** Résultat d'un pari score exact : bon vainqueur ou score parfait. */
export type ScorePrecision = "tendance" | "exact";

export type UserRole = "user" | "admin";

export type MatchStage =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third_place"
  | "final";

export type TacklePhase = "group" | "knockout";

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
  /** Date de coup d'envoi (depuis le match lié, pour affichage dans l'arbre). */
  scheduled_kickoff?: string | null;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_id?: string | null;
  avatar_url: string | null;
  /** Total de points (ex-colonne balance). */
  points: number;
  /** Jokers Boost x2 restants (1 par tournoi par défaut). */
  boosts_available?: number;
  /** Série On Fire : victoires classiques consécutives. */
  heat_streak?: number;
  /** Actif après 3 victoires classiques d'affilée. */
  on_fire?: boolean;
  favorite_team_id?: number | null;
  /** Badges choisis pour l'affichage public (max 5). */
  profile_badge_ids?: string[];
  role?: UserRole;
  /** Joueur système (pronostiqueur IA). */
  is_ai?: boolean;
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
  live_minute?: number | null;
  live_injury_time?: number | null;
  /** Instant de référence pour le chrono recalibré par l'admin. */
  live_clock_anchor_at?: string | null;
  live_clock_manual?: boolean;
  odds_synced_at?: string | null;
  odds_api_event_id?: number | null;
  odd_home: number | null;
  odd_draw: number | null;
  odd_away: number | null;
  is_golden?: boolean;
  ai_summary?: string | null;
  settled_at?: string | null;
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

export interface DashboardStats {
  pendingBets: number;
  rank: number | null;
  totalPlayers: number;
  /** Points provisoires (pronos en bonne voie sur matchs live). */
  livePoints: number;
  /** Classement si on inclut les points live (null si aucun live actif). */
  liveRank: number | null;
  hasLiveScoring: boolean;
}

export interface DashboardData {
  profile: Profile;
  upcomingMatches: MatchWithTeams[];
  stats: DashboardStats;
  isDemo?: boolean;
}

export type LeaderboardSort = "points" | "live_points" | "classic_won" | "fun_won";

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

export interface LeaderboardPlayerBadge {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  rarity: string;
  unlocked_at: string;
}

export interface LeaderboardEntry {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url?: string | null;
  /** Points totaux (RPC renvoie encore la colonne `balance`). */
  balance: number;
  /** Points provisoires sur matchs en direct (non crédités en base). */
  live_points?: number;
  classic_won: number;
  classic_lost: number;
  fun_won: number;
  fun_lost: number;
  total_won: number;
  total_lost: number;
  /** Mode On Fire (classement général uniquement en UI). */
  on_fire?: boolean;
  /** Série de victoires classiques en cours (0–3+). */
  heat_streak?: number;
  leagues?: LeaderboardLeagueTag[];
  badges?: LeaderboardPlayerBadge[];
  /** Joueur système (pronostiqueur IA). */
  is_ai?: boolean;
}

export interface BetRow {
  id: string;
  match_id: number;
  market_id: string | null;
  fun_market_id?: string | null;
  bet_type: BetType;
  selection: {
    selection?: MatchResultSelection;
    outcome?: FunOutcome;
    fun_market_id?: string;
    home?: number;
    away?: number;
  };
  odd_at_placement: number;
  stake: number;
  potential_payout: number;
  is_boosted?: boolean;
  score_precision?: ScorePrecision | null;
  status: BetStatus;
  placed_at: string;
  settled_at?: string | null;
  match: Pick<
    MatchWithTeams,
    | "id"
    | "round"
    | "status"
    | "kickoff_at"
    | "is_golden"
    | "home_score"
    | "away_score"
    | "live_minute"
    | "live_injury_time"
    | "live_clock_anchor_at"
    | "live_clock_manual"
    | "home_team"
    | "away_team"
  > | null;
  fun_market?: Pick<FunMarket, "id" | "question" | "status"> | null;
}
