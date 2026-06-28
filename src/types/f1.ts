import type { MatchStatus } from "@/types/database";
import type { ActiveSport } from "@/lib/sport/constants";

export interface F1LiveStandingRow {
  position: number;
  driver_number: number;
  driver_name: string;
  team_name: string | null;
  team_colour: string | null;
}

export interface F1LiveWeather {
  trackTemperature: number | null;
  airTemperature: number | null;
  rainfall: number | null;
}

export interface F1LiveSnapshot {
  standings: F1LiveStandingRow[];
  flag: string | null;
  flagLabel: string;
  raceControlMessage: string | null;
  weather: F1LiveWeather | null;
  updatedAt: string;
}

import type { OpenF1Session } from "@/lib/f1/types";
import type { F1RaceResultRow } from "@/lib/f1/race-order-scoring";

export interface F1MeetingSession {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
}

export interface F1Meeting {
  meeting_key: number;
  year: number;
  meeting_name: string;
  meeting_official_name: string | null;
  location: string | null;
  country_name: string | null;
  country_code: string | null;
  circuit_key: number | null;
  circuit_short_name: string | null;
  circuit_image: string | null;
  date_start: string;
  date_end: string;
  race_session_key: number | null;
  race_start_at: string | null;
  quali_session_key: number | null;
  quali_start_at: string | null;
  pole_driver_number: number | null;
  race_results: F1RaceResultRow[] | null;
  sessions: F1MeetingSession[] | null;
  status: MatchStatus;
  winner_driver_number: number | null;
  settled_at: string | null;
  is_cancelled: boolean;
}

export interface F1Driver {
  id: number;
  meeting_key: number;
  driver_number: number;
  full_name: string;
  name_acronym: string | null;
  team_name: string | null;
  team_colour: string | null;
  headshot_url: string | null;
  winner_odd: number | null;
}

export interface F1Bet {
  id: string;
  user_id: string;
  meeting_key: number;
  bet_type: "race_winner" | "race_order" | "pole_position" | "teammate_duel";
  driver_number: number | null;
  selection: number[] | null;
  odd_at_placement: number;
  potential_payout: number;
  status: "pending" | "won" | "lost" | "void" | "cancelled";
  is_boosted: boolean;
  settled_at: string | null;
  created_at: string;
}

export interface F1LeaderboardEntry {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  f1_won: number;
  f1_lost: number;
  f1_pending: number;
  f1_earned_points: number;
}

export type { ActiveSport };
