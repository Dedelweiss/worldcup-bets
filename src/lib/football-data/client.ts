import type {
  FootballDataCompetitionMatchesResponse,
  FootballDataCompetitionTeamsResponse,
  FootballDataMatch,
  FootballDataScorersResponse,
  FootballDataTeamDetail,
} from "@/lib/football-data/types";

const BASE_URL = "https://api.football-data.org/v4";
export const FOOTBALL_DATA_WC_CODE = "WC";
export const FOOTBALL_DATA_WC_SEASON = 2026;
/** ID compétition FIFA World Cup (lookup football-data). */
export const FOOTBALL_DATA_WC_COMPETITION_ID = 2000;

export function getFootballDataApiKey(): string | null {
  return process.env.FOOTBALL_DATA_API_KEY?.trim() || null;
}

export function hasFootballDataConfig(): boolean {
  return Boolean(getFootballDataApiKey());
}

async function footballDataFetch<T>(path: string): Promise<T> {
  const apiKey = getFootballDataApiKey();
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY is not configured");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-Auth-Token": apiKey,
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `football-data.org ${res.status}: ${body.slice(0, 200)}`,
    );
  }

  return res.json() as Promise<T>;
}

export async function fetchWcMatches(): Promise<FootballDataCompetitionMatchesResponse> {
  return footballDataFetch<FootballDataCompetitionMatchesResponse>(
    `/competitions/${FOOTBALL_DATA_WC_CODE}/matches?season=${FOOTBALL_DATA_WC_SEASON}`,
  );
}

export async function fetchWcTeams(): Promise<FootballDataCompetitionTeamsResponse> {
  return footballDataFetch<FootballDataCompetitionTeamsResponse>(
    `/competitions/${FOOTBALL_DATA_WC_CODE}/teams?season=${FOOTBALL_DATA_WC_SEASON}`,
  );
}

function formatDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Matchs WC sur une fenêtre de dates (tests / coupes en cours). */
export async function fetchWcMatchesInWindow(
  dateFrom: Date,
  dateTo: Date,
): Promise<FootballDataCompetitionMatchesResponse> {
  return footballDataFetch<FootballDataCompetitionMatchesResponse>(
    `/competitions/${FOOTBALL_DATA_WC_CODE}/matches?season=${FOOTBALL_DATA_WC_SEASON}&dateFrom=${formatDateParam(dateFrom)}&dateTo=${formatDateParam(dateTo)}`,
  );
}

export async function fetchFootballDataMatchById(
  matchId: number,
): Promise<FootballDataMatch> {
  return footballDataFetch<FootballDataMatch>(`/matches/${matchId}`);
}

export async function fetchFootballDataTeamById(
  teamId: number,
): Promise<FootballDataTeamDetail> {
  return footballDataFetch<FootballDataTeamDetail>(`/teams/${teamId}`);
}

export async function fetchWcScorers(): Promise<FootballDataScorersResponse> {
  return footballDataFetch<FootballDataScorersResponse>(
    `/competitions/${FOOTBALL_DATA_WC_CODE}/scorers?season=${FOOTBALL_DATA_WC_SEASON}&limit=100`,
  );
}
