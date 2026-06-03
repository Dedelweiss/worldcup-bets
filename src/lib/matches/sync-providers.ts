import { hasFootballDataConfig } from "@/lib/football-data/client";
import {
  syncFootballDataWc2026,
  type SyncFootballDataResult,
} from "@/lib/football-data/sync-wc2026";
import { hasOddsApiConfig } from "@/lib/odds-api/client";
import {
  syncOddsApiWc2026,
  type SyncOddsApiResult,
} from "@/lib/odds-api/sync-wc2026";

export interface SyncMatchProvidersResult {
  ok: boolean;
  footballData?: SyncFootballDataResult;
  oddsApi?: SyncOddsApiResult;
  error?: string;
}

/**
 * football-data.org → scores, minute, statut, liaison match.
 * odds-api.io → cotes 1N2 (live + pré-match), liaison odds_api_event_id.
 */
export async function syncMatchProviders(options?: {
  force?: boolean;
}): Promise<SyncMatchProvidersResult> {
  const hasFd = hasFootballDataConfig();
  const hasOdds = hasOddsApiConfig();

  if (!hasFd && !hasOdds) {
    return {
      ok: false,
      error: "FOOTBALL_DATA_API_KEY ou ODDS_API_KEY requise",
    };
  }

  let footballData: SyncFootballDataResult | undefined;
  let oddsApi: SyncOddsApiResult | undefined;

  if (hasFd) {
    footballData = await syncFootballDataWc2026({
      force: options?.force,
      skipOdds: hasOdds,
    });
    if (!footballData.ok) {
      return {
        ok: false,
        footballData,
        oddsApi,
        error: footballData.error,
      };
    }
  }

  if (hasOdds) {
    oddsApi = await syncOddsApiWc2026({ force: options?.force });
    if (!oddsApi.ok) {
      return {
        ok: false,
        footballData,
        oddsApi,
        error: oddsApi.error,
      };
    }
  }

  return { ok: true, footballData, oddsApi };
}
