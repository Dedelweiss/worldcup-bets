import type { ActiveSport } from "@/lib/sport/constants";

const F1_ROUTE_PREFIXES = ["/f1", "/admin/f1"] as const;

const FOOTBALL_ROUTE_PREFIXES = [
  "/dashboard",
  "/matches",
  "/leaderboard",
  "/leagues",
  "/bracket",
  "/collection",
  "/shop",
  "/help",
  "/teams",
  "/choose-favorite-team",
  "/onboarding",
] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Sport shown in the shell: route wins on explicit football/F1 pages;
 * shared routes (/bets, /profile) keep the stored preference.
 */
export function resolveActiveSportForPath(
  pathname: string,
  stored: ActiveSport,
): ActiveSport {
  if (F1_ROUTE_PREFIXES.some((p) => matchesPrefix(pathname, p))) return "f1";
  if (FOOTBALL_ROUTE_PREFIXES.some((p) => matchesPrefix(pathname, p))) {
    return "football";
  }
  return stored;
}
