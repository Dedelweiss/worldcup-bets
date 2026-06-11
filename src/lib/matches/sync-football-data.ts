import { logAppEvent } from "@/lib/logging/app-logger";
import {
  FOOTBALL_DATA_SYNC_INTERVAL_IDLE_MS,
  FOOTBALL_DATA_SYNC_INTERVAL_LIVE_MS,
} from "@/lib/football-data/rate-limit";
import { hasFootballDataConfig } from "@/lib/football-data/client";
import { syncFootballDataWc2026 } from "@/lib/football-data/sync-wc2026";
import { needsLiveScoreSync } from "@/lib/matches/needs-live-score-sync";

let lastSyncAt = 0;
let syncInFlight: Promise<void> | null = null;
let cachedLiveMode: boolean | null = null;
let cachedLiveModeAt = 0;
const LIVE_MODE_CACHE_MS = 15_000;

async function resolveSyncIntervalMs(): Promise<number> {
  const now = Date.now();
  if (
    cachedLiveMode != null &&
    now - cachedLiveModeAt < LIVE_MODE_CACHE_MS
  ) {
    return cachedLiveMode
      ? FOOTBALL_DATA_SYNC_INTERVAL_LIVE_MS
      : FOOTBALL_DATA_SYNC_INTERVAL_IDLE_MS;
  }

  const live = await needsLiveScoreSync(now);
  cachedLiveMode = live;
  cachedLiveModeAt = now;
  return live
    ? FOOTBALL_DATA_SYNC_INTERVAL_LIVE_MS
    : FOOTBALL_DATA_SYNC_INTERVAL_IDLE_MS;
}

/** Scores, minute, statut via football-data.org (pas les cotes odds-api). */
export async function syncFootballDataMatches(options?: {
  force?: boolean;
}): Promise<void> {
  if (!hasFootballDataConfig()) return;

  const now = Date.now();
  if (!options?.force) {
    const intervalMs = await resolveSyncIntervalMs();
    if (now - lastSyncAt < intervalMs) return;
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
      const message = e instanceof Error ? e.message : String(e);
      logAppEvent({
        level: "error",
        source: "sync.football-data.cron",
        message,
      });
    } finally {
      syncInFlight = null;
    }
  })();

  await syncInFlight;
}
