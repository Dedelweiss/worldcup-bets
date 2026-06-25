/**
 * Plan gratuit football-data.org : 10 requêtes / minute (1 req/sync → 60 s live = OK).
 * Note : le tier gratuit expose des scores « delayed » ; la fréquence ne supprime pas ce délai source.
 */
export const FOOTBALL_DATA_FREE_PLAN_CALLS_PER_MINUTE = 10;

/** Sync auto pendant matchs live ou fenêtre de coup d'envoi. */
export const FOOTBALL_DATA_SYNC_INTERVAL_LIVE_MS = 60 * 1000;

/** Sync auto hors fenêtre de match (économie de quota). */
export const FOOTBALL_DATA_SYNC_INTERVAL_IDLE_MS = 5 * 60 * 1000;

/** @deprecated Préférer LIVE / IDLE selon le contexte. */
export const FOOTBALL_DATA_SYNC_INTERVAL_MS =
  FOOTBALL_DATA_SYNC_INTERVAL_IDLE_MS;

/** Détail match : jusqu'à 3 appels / sync forcée si les cotes manquent sur la liste. */
export const FOOTBALL_DATA_MAX_ODDS_DETAIL_FETCHES = 3;

/** Endpoint /teams : uniquement si des équipes ne sont pas encore liées, et pas plus d’une fois / 24 h. */
export const FOOTBALL_DATA_TEAMS_ENDPOINT_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Effectifs : resync au plus une fois / 7 jours par équipe. */
export const FOOTBALL_DATA_SQUAD_SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/** Max équipes dont l'effectif est rafraîchi par passage cron (évite le burst). */
export const FOOTBALL_DATA_MAX_SQUAD_SYNCS_PER_RUN = 1;

/** Lot admin manuel (quota football-data ~10 req/min). */
export const FOOTBALL_DATA_MAX_SQUAD_SYNCS_ADMIN = 8;

/** Enrichissement numéros maillot via /teams/{id} (1 req / équipe). */
export const FOOTBALL_DATA_SHIRT_ENRICH_INTERVAL_MS = 6_500;
