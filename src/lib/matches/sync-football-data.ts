import { FOOTBALL_DATA_SYNC_INTERVAL_MS } from "@/lib/football-data/rate-limit";
import { hasFootballDataConfig } from "@/lib/football-data/client";
import { syncFootballDataWc2026 } from "@/lib/football-data/sync-wc2026";

let lastSyncAt = 0;
let syncInFlight: Promise<void> | null = null;

/** Scores, minute, statut via football-data.org (pas les cotes odds-api). */
export async function syncFootballDataMatches(options?: {
  force?: boolean;
}): Promise<void> {
  if (!hasFootballDataConfig()) return;

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
      await syncFootballDataWc2026({
        force: options?.force,
        skipOdds: true,
      });
      lastSyncAt = Date.now();
    } catch (e) {
      console.error("syncFootballDataMatches:", e);
    } finally {
      syncInFlight = null;
    }
  })();

  await syncInFlight;
}
