export type CardRarity = "commune" | "rare" | "epique" | "legendaire";

export interface CardStats {
  position?: string | null;
  age?: number | null;
  shirtNumber?: number | null;
  goals?: number | null;
  icon?: string | null;
  decade?: string | null;
  subtitle?: string | null;
  region?: string | null;
}

export interface CardCatalogEntry {
  id: string;
  code: string;
  name: string;
  rarity: CardRarity;
  category: string | null;
  country_code: string | null;
  position: string | null;
  image_path: string | null;
  stats: CardStats | null;
}

/** Une carte du catalogue enrichie de l'état de possession du joueur. */
export interface AlbumCard extends CardCatalogEntry {
  owned: boolean;
  quantity: number;
  /** Numéro stable de la carte dans l'album (style Panini). */
  number: number;
}

/** Section de l'album regroupée par nation (ou cartes spéciales). */
export interface AlbumGroup {
  key: string;
  label: string;
  cards: AlbumCard[];
  ownedCount: number;
  totalCount: number;
}

export interface InventoryPack {
  id: string;
  pack_type_id: string;
  pack_name: string;
  source: "purchase" | "bet_drop";
}

/** Carte révélée lors de l'ouverture d'un pack (retour de la RPC open_pack). */
export interface OpenedCard {
  card_id: string;
  code: string;
  name: string;
  rarity: CardRarity;
  category?: string | null;
  country_code: string | null;
  position?: string | null;
  stats?: CardStats | null;
  image_path: string | null;
  duplicate: boolean;
}

export interface OpenPackResult {
  opening_id: string;
  cards: OpenedCard[];
  shards_gained: number;
}

export interface CollectionData {
  points: number;
  /** Jetons dédiés à l'achat de packs (distincts des points de classement). */
  coins: number;
  shards: number;
  groups: AlbumGroup[];
  inventory: InventoryPack[];
  ownedCount: number;
  totalCount: number;
  catalogCap: number;
}
