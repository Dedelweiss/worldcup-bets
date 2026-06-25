/** Plafond global du catalogue (album complet). */
export const MAX_CATALOG_CARDS = 1000;

/** Cartes spéciales toujours réservées (hors joueurs) — aligné sur SPECIAL_CARDS_CATALOG. */
export const SPECIAL_CARD_RESERVE = 22;

/** Slots disponibles pour les cartes joueurs après réservation des spéciales. */
export const MAX_PLAYER_CARDS = MAX_CATALOG_CARDS - SPECIAL_CARD_RESERVE;

export const RARITY_PRIORITY = {
  legendaire: 4,
  epique: 3,
  rare: 2,
  commune: 1,
} as const;
