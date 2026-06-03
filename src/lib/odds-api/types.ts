export interface OddsApiSport {
  name: string;
  slug: string;
}

export interface OddsApiLeague {
  name: string;
  slug: string;
}

export interface OddsApiEvent {
  id: number;
  sport?: OddsApiSport | null;
  league?: OddsApiLeague | null;
  home: string;
  away: string;
  date: string;
  status?: string | null;
  scores?: {
    home?: number | null;
    away?: number | null;
  } | null;
}

export interface OddsApiMlOddsRow {
  home?: string | number | null;
  draw?: string | number | null;
  away?: string | number | null;
}

export interface OddsApiMarket {
  name: string;
  odds: OddsApiMlOddsRow[];
  updatedAt?: string | null;
}

export interface OddsApiOddsResponse {
  id: number;
  home: string;
  away: string;
  date: string;
  status?: string | null;
  bookmakers?: Record<string, OddsApiMarket[]>;
}
