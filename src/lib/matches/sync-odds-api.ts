import { hasOddsApiConfig } from "@/lib/odds-api/client";
import { formatOddsApiError } from "@/lib/odds-api/errors";
import {
  syncOddsApiWc2026,
  type SyncOddsApiResult,
} from "@/lib/odds-api/sync-wc2026";

let lastSyncAt = 0;
let syncInFlight: Promise<SyncOddsApiResult | null> | null = null;

/** Cotes 1N2 via odds-api.io — réservé au bouton admin (quota API). */
export async function syncOddsApiMatches(options?: {
  force?: boolean;
}): Promise<SyncOddsApiResult | null> {
  if (!hasOddsApiConfig()) return null;

  const now = Date.now();
  const minInterval = 60_000;
  if (!options?.force && now - lastSyncAt < minInterval) {
    return null;
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    try {
      const result = await syncOddsApiWc2026({ force: options?.force });
      if (result.ok) lastSyncAt = Date.now();
      return result;
    } catch (e) {
      console.error("syncOddsApiMatches:", formatOddsApiError(e));
      return {
        ok: false,
        oddsUpdated: 0,
        linkedEvents: 0,
        eventsLoaded: 0,
        apiCalls: 0,
        leagueSlug: null,
        error: formatOddsApiError(e),
      };
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}
