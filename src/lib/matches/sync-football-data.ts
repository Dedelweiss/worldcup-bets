import { FOOTBALL_DATA_SYNC_INTERVAL_MS } from "@/lib/football-data/rate-limit";
import { hasFootballDataConfig } from "@/lib/football-data/client";
import { hasOddsApiConfig } from "@/lib/odds-api/client";
import { syncMatchProviders } from "@/lib/matches/sync-providers";

let lastSyncAt = 0;
let syncInFlight: Promise<void> | null = null;

/** Synchronise live/scores (football-data) et cotes (odds-api) pour la CDM 2026. */
export async function syncFootballDataMatches(options?: {
  force?: boolean;
}): Promise<void> {
  if (!hasFootballDataConfig() && !hasOddsApiConfig()) return;

  const now = Date.now();
  if (!options?.force && now - lastSyncAt < FOOTBALL_DATA_SYNC_INTERVAL_MS) {
    return;
  }

  if (syncInFlight) {
    await syncInFlight;
    return;
  }

  syncInFlight = (async () => {
    try {
      await syncMatchProviders({ force: options?.force });
      lastSyncAt = Date.now();
    } finally {
      syncInFlight = null;
    }
  })();

  await syncInFlight;
}
