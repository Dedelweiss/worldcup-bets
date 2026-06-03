import {
  ODDS_API_DEFAULT_BOOKMAKERS,
} from "@/lib/odds-api/rate-limit";
import type {
  OddsApiEvent,
  OddsApiLeague,
  OddsApiOddsResponse,
} from "@/lib/odds-api/types";

const BASE_URL = "https://api.odds-api.io/v3";

export function getOddsApiKey(): string | null {
  return (
    process.env.ODDS_API_KEY?.trim() ||
    process.env.ODDS_API_IO_KEY?.trim() ||
    null
  );
}

export function hasOddsApiConfig(): boolean {
  return Boolean(getOddsApiKey());
}

export function getOddsApiBookmakers(): string[] {
  const raw = process.env.ODDS_API_BOOKMAKERS?.trim();
  if (!raw) return [...ODDS_API_DEFAULT_BOOKMAKERS];
  return raw
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
}

function getWcLeagueSlugOverride(): string | null {
  return process.env.ODDS_API_WC_LEAGUE_SLUG?.trim() || null;
}

async function oddsApiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const apiKey = getOddsApiKey();
  if (!apiKey) {
    throw new Error("ODDS_API_KEY is not configured");
  }

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("apiKey", apiKey);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`odds-api.io ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchOddsApiLeagues(
  sport = "football",
): Promise<OddsApiLeague[]> {
  const data = await oddsApiFetch<OddsApiLeague[] | { leagues?: OddsApiLeague[] }>(
    "/leagues",
    { sport },
  );
  if (Array.isArray(data)) return data;
  return data.leagues ?? [];
}

/** Slug ligue CDM : env ou détection (World Cup / FIFA 2026). */
export async function resolveWcLeagueSlug(): Promise<string | null> {
  const override = getWcLeagueSlugOverride();
  if (override) return override;

  const leagues = await fetchOddsApiLeagues("football");
  const wc = leagues.find((l) => {
    const name = (l.name ?? "").toLowerCase();
    const slug = (l.slug ?? "").toLowerCase();
    return (
      /world\s*cup|fifa.*2026|wc\s*2026/.test(name) ||
      /world-cup|worldcup|fifa-world-cup/.test(slug)
    );
  });
  return wc?.slug ?? null;
}

export async function fetchOddsApiEvents(params: {
  sport?: string;
  league?: string;
  status?: string;
  limit?: number;
}): Promise<OddsApiEvent[]> {
  const query: Record<string, string> = {
    sport: params.sport ?? "football",
    limit: String(params.limit ?? 100),
  };
  if (params.league) query.league = params.league;
  if (params.status) query.status = params.status;

  const data = await oddsApiFetch<OddsApiEvent[] | { events?: OddsApiEvent[] }>(
    "/events",
    query,
  );
  if (Array.isArray(data)) return data;
  return data.events ?? [];
}

/** Événements en cours (doc quickstart : status=live sur /events). */
export async function fetchOddsApiLiveEvents(): Promise<OddsApiEvent[]> {
  const fromStatus = await fetchOddsApiEvents({
    sport: "football",
    status: "live",
    limit: 100,
  });

  let fromLiveEndpoint: OddsApiEvent[] = [];
  try {
    const data = await oddsApiFetch<OddsApiEvent[] | { events?: OddsApiEvent[] }>(
      "/events/live",
    );
    fromLiveEndpoint = Array.isArray(data) ? data : (data.events ?? []);
  } catch {
    // /events/live optionnel selon plan
  }

  const byId = new Map<number, OddsApiEvent>();
  for (const e of [...fromStatus, ...fromLiveEndpoint]) {
    if (e.id) byId.set(e.id, e);
  }
  return [...byId.values()];
}

export async function fetchOddsApiOddsMulti(
  eventIds: number[],
): Promise<OddsApiOddsResponse[]> {
  if (eventIds.length === 0) return [];

  const bookmakers = getOddsApiBookmakers().join(",");
  const data = await oddsApiFetch<OddsApiOddsResponse[] | OddsApiOddsResponse>(
    "/odds/multi",
    {
      eventIds: eventIds.join(","),
      bookmakers,
    },
  );

  if (Array.isArray(data)) return data;
  return [data];
}
