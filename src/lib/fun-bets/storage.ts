const STORAGE_KEY = "wc2026_fun_unread_v1";

export interface UnreadFunMarket {
  marketId: string;
  matchId: number;
  createdAt: string;
}

/** Référence stable pour useSyncExternalStore (SSR + liste vide). */
export const EMPTY_UNREAD_FUN_MARKETS: UnreadFunMarket[] = [];

interface UnreadStore {
  markets: Record<string, UnreadFunMarket>;
}

function readStore(): UnreadStore {
  if (typeof window === "undefined") return { markets: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { markets: {} };
    const parsed = JSON.parse(raw) as UnreadStore;
    if (!parsed?.markets || typeof parsed.markets !== "object") {
      return { markets: {} };
    }
    return parsed;
  } catch {
    return { markets: {} };
  }
}

function writeStore(store: UnreadStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

let unreadSnapshotCache: UnreadFunMarket[] = EMPTY_UNREAD_FUN_MARKETS;
let unreadSnapshotKey = "";

function unreadMarketsCacheKey(markets: UnreadFunMarket[]): string {
  return markets
    .map((m) => m.marketId)
    .sort()
    .join("|");
}

/** Snapshot stable pour useSyncExternalStore (évite les boucles infinies). */
export function getUnreadFunMarketsSnapshot(): UnreadFunMarket[] {
  const markets = Object.values(readStore().markets);
  const key = unreadMarketsCacheKey(markets);
  if (key === unreadSnapshotKey) {
    return unreadSnapshotCache;
  }
  unreadSnapshotKey = key;
  unreadSnapshotCache =
    markets.length === 0 ? EMPTY_UNREAD_FUN_MARKETS : markets;
  return unreadSnapshotCache;
}

export function loadUnreadFunMarkets(): UnreadFunMarket[] {
  return getUnreadFunMarketsSnapshot();
}

export function getUnreadFunCount(): number {
  return loadUnreadFunMarkets().length;
}

export function addUnreadFunMarket(entry: UnreadFunMarket): UnreadFunMarket[] {
  const store = readStore();
  if (store.markets[entry.marketId]) {
    return Object.values(store.markets);
  }
  store.markets[entry.marketId] = entry;
  writeStore(store);
  return Object.values(store.markets);
}

export function markFunMarketsSeen(marketIds: string[]): UnreadFunMarket[] {
  if (marketIds.length === 0) return loadUnreadFunMarkets();
  const store = readStore();
  for (const id of marketIds) {
    delete store.markets[id];
  }
  writeStore(store);
  return Object.values(store.markets);
}

export function markFunMatchSeen(matchId: number): UnreadFunMarket[] {
  const store = readStore();
  for (const [id, entry] of Object.entries(store.markets)) {
    if (entry.matchId === matchId) {
      delete store.markets[id];
    }
  }
  writeStore(store);
  return Object.values(store.markets);
}
