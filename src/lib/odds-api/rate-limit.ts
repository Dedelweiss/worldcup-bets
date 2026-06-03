/** Plans odds-api.io : de 100 à 5 000 req/h — privilégier /odds/multi (10 matchs = 1 req). */
export const ODDS_API_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const ODDS_API_MULTI_BATCH_SIZE = 10;

/** Bookmakers par défaut (ML 1N2). Surcharge via ODDS_API_BOOKMAKERS. */
export const ODDS_API_DEFAULT_BOOKMAKERS = ["Bet365", "Unibet"];
