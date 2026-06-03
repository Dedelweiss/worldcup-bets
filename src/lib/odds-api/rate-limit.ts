/** Plan odds-api.io : 5 000 requêtes / heure — privilégier /odds/multi (10 events = 1 req). */
export const ODDS_API_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const ODDS_API_MULTI_BATCH_SIZE = 10;

/** Bookmakers par défaut (ML 1N2). Surcharge via ODDS_API_BOOKMAKERS. */
export const ODDS_API_DEFAULT_BOOKMAKERS = ["Bet365", "Unibet"];
