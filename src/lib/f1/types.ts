export interface OpenF1Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name?: string;
  location?: string;
  country_name?: string;
  country_code?: string;
  circuit_key?: number;
  circuit_short_name?: string;
  circuit_image?: string;
  date_start: string;
  date_end: string;
  year: number;
  is_cancelled?: boolean;
}

export interface OpenF1Session {
  session_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_short_name?: string;
  year: number;
  is_cancelled?: boolean;
}

export interface OpenF1Driver {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  broadcast_name?: string;
  full_name: string;
  name_acronym?: string;
  team_name?: string;
  team_colour?: string;
  first_name?: string;
  last_name?: string;
  headshot_url?: string;
}

export interface OpenF1SessionResult {
  position: number;
  driver_number: number;
  meeting_key: number;
  session_key: number;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
}

export interface OpenF1Position {
  date: string;
  driver_number: number;
  meeting_key: number;
  position: number;
  session_key: number;
}

export interface OpenF1RaceControl {
  date: string;
  category?: string;
  flag?: string | null;
  message?: string;
  scope?: string;
  sector?: number | null;
  session_key: number;
  meeting_key?: number;
}

export interface OpenF1Weather {
  air_temperature?: number;
  track_temperature?: number;
  humidity?: number;
  wind_direction?: number;
  wind_speed?: number;
  rainfall?: number;
  session_key: number;
  meeting_key?: number;
  date: string;
}
