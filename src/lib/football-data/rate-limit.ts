/**
 * Plan gratuit football-data.org : 10 requêtes / minute.
 * On vise au plus 1 requête par synchronisation et une sync au plus toutes les 5 minutes.
 */
export const FOOTBALL_DATA_FREE_PLAN_CALLS_PER_MINUTE = 10;

/** Intervalle minimum entre deux sync automatiques (hors bouton admin « forcer »). */
export const FOOTBALL_DATA_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/** Détail match : jusqu'à 3 appels / sync forcée si les cotes manquent sur la liste. */
export const FOOTBALL_DATA_MAX_ODDS_DETAIL_FETCHES = 3;

/** Endpoint /teams : uniquement si des équipes ne sont pas encore liées, et pas plus d’une fois / 24 h. */
export const FOOTBALL_DATA_TEAMS_ENDPOINT_INTERVAL_MS = 24 * 60 * 60 * 1000;
