import { teamNamesMatchForOdds } from "@/lib/tournament/team-api-names";
import type { OddsApiEvent } from "@/lib/odds-api/types";

/** Fenêtre élargie : décalages horaires / sources API. */
const KICKOFF_MATCH_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface LocalMatchForOddsLink {
  id: number;
  home_team_id: number;
  away_team_id: number;
  kickoff_at: string;
  status: string;
  odds_api_event_id: number | null;
  home_name: string;
  away_name: string;
  home_code: string | null;
  away_code: string | null;
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
      teamNamesMatchForOdds(event.home, local.home_name, local.home_code) &&
      teamNamesMatchForOdds(event.away, local.away_name, local.away_code);
    const swapped =
      teamNamesMatchForOdds(event.home, local.away_name, local.away_code) &&
      teamNamesMatchForOdds(event.away, local.home_name, local.home_code);

    if (!direct && !swapped) continue;

    if (delta < bestDelta) {
      bestDelta = delta;
      best = { event, swapSides: swapped && !direct };
    }
  }

  return best;
}
