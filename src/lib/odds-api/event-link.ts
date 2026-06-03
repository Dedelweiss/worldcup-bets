import type { OddsApiEvent } from "@/lib/odds-api/types";

const KICKOFF_MATCH_WINDOW_MS = 3 * 60 * 60 * 1000;

export function normalizeEventTeamName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function teamNamesMatch(apiName: string, dbName: string): boolean {
  const a = normalizeEventTeamName(apiName);
  const b = normalizeEventTeamName(dbName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4) {
    return a.includes(b) || b.includes(a);
  }
  return false;
}

export interface LocalMatchForOddsLink {
  id: number;
  home_team_id: number;
  away_team_id: number;
  kickoff_at: string;
  status: string;
  odds_api_event_id: number | null;
  home_name: string;
  away_name: string;
}

export function isWorldCupEvent(
  event: OddsApiEvent,
  leagueSlug: string | null,
): boolean {
  const slug = (event.league?.slug ?? "").toLowerCase();
  const name = (event.league?.name ?? "").toLowerCase();
  if (leagueSlug && slug === leagueSlug.toLowerCase()) return true;
  return (
    /world\s*cup|fifa.*2026/.test(name) ||
    /world-cup|worldcup|fifa-world-cup/.test(slug)
  );
}

export function findOddsEventForLocalMatch(
  local: LocalMatchForOddsLink,
  events: OddsApiEvent[],
): { event: OddsApiEvent; swapSides: boolean } | null {
  const kickoffLocal = new Date(local.kickoff_at).getTime();

  let best: { event: OddsApiEvent; swapSides: boolean } | null = null;
  let bestDelta = Infinity;

  for (const event of events) {
    const kickoffEvent = new Date(event.date).getTime();
    const delta = Math.abs(kickoffEvent - kickoffLocal);
    if (delta > KICKOFF_MATCH_WINDOW_MS) continue;

    const direct =
      teamNamesMatch(event.home, local.home_name) &&
      teamNamesMatch(event.away, local.away_name);
    const swapped =
      teamNamesMatch(event.home, local.away_name) &&
      teamNamesMatch(event.away, local.home_name);

    if (!direct && !swapped) continue;

    if (delta < bestDelta) {
      bestDelta = delta;
      best = { event, swapSides: swapped && !direct };
    }
  }

  return best;
}
