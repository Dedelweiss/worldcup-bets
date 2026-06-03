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
  /** Sync partielle (ex. live OK, cotes en quota dépassé). */
  warning?: string;
}

/**
 * football-data.org → scores, minute, statut, liaison match.
 * odds-api.io → cotes 1N2 (live + pré-match), liaison odds_api_event_id.
 */
export async function syncMatchProviders(options?: {
  force?: boolean;
  /** false par défaut : cotes uniquement via le bouton admin */
  includeOdds?: boolean;
}): Promise<SyncMatchProvidersResult> {
  const hasFd = hasFootballDataConfig();
  const hasOdds = hasOddsApiConfig();
  const includeOdds = options?.includeOdds === true;

  if (!hasFd && (!hasOdds || !includeOdds)) {
    return {
      ok: false,
      error: includeOdds
        ? "FOOTBALL_DATA_API_KEY ou ODDS_API_KEY requise"
        : "FOOTBALL_DATA_API_KEY manquante",
    };
  }

  let footballData: SyncFootballDataResult | undefined;
  let oddsApi: SyncOddsApiResult | undefined;

  if (hasFd) {
    try {
      footballData = await syncFootballDataWc2026({
        force: options?.force,
        skipOdds: true,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync football-data échouée";
      return { ok: false, error: message };
    }
    if (!footballData.ok) {
      return {
        ok: false,
        footballData,
        oddsApi,
        error: footballData.error,
      };
    }
  }

  if (includeOdds && hasOdds) {
    try {
      oddsApi = await syncOddsApiWc2026({ force: true });
    } catch (e) {
      const { formatOddsApiError } = await import("@/lib/odds-api/errors");
      const msg = formatOddsApiError(e);
      if (footballData?.ok) {
        return {
          ok: true,
          footballData,
          warning: `Scores OK, cotes non synchronisées : ${msg}`,
        };
      }
      return { ok: false, footballData, error: msg };
    }
    if (!oddsApi.ok) {
      const partialLiveOk = Boolean(footballData?.ok);
      if (partialLiveOk) {
        return {
          ok: true,
          footballData,
          oddsApi,
          warning: `Scores mis à jour, mais les cotes n'ont pas pu être synchronisées : ${oddsApi.error}`,
        };
      }
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
