import type { MatchWithTeams } from "@/types/database";

/** Cotes issues d'une sync API (odds-api.io ou football-data.org) via odds_synced_at. */
export function hasApiSyncedOdds(
  match: Pick<MatchWithTeams, "odd_home" | "odd_draw" | "odd_away"> & {
    odds_synced_at?: string | null;
  },
): boolean {
  return (
    match.odds_synced_at != null &&
    match.odd_home != null &&
    match.odd_draw != null &&
    match.odd_away != null
  );
}
