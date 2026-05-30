"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  addUnreadFunMarket,
  EMPTY_UNREAD_FUN_MARKETS,
  getUnreadFunCount,
  getUnreadFunMarketsSnapshot,
  markFunMarketsSeen,
  markFunMatchSeen,
  type UnreadFunMarket,
} from "@/lib/fun-bets/storage";

const SERVER_UNREAD_COUNT = 0;

function getServerUnreadCount(): number {
  return SERVER_UNREAD_COUNT;
}

function getServerUnreadMarkets(): UnreadFunMarket[] {
  return EMPTY_UNREAD_FUN_MARKETS;
}

interface FunBetsNotificationsContextValue {
  unreadCount: number;
  unreadMarkets: UnreadFunMarket[];
  registerUnread: (entry: UnreadFunMarket) => void;
  markMarketsSeen: (marketIds: string[]) => void;
  markMatchSeen: (matchId: number) => void;
}

const FunBetsNotificationsContext =
  createContext<FunBetsNotificationsContextValue | null>(null);

const STORAGE_EVENT = "fun-bets-storage";

function subscribe(onStoreChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.includes("wc2026_fun_unread")) {
      onStoreChange();
    }
  };
  const onLocal = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(STORAGE_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STORAGE_EVENT, onLocal);
  };
}

function notifyStorageChange() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function FunBetsNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const unreadCount = useSyncExternalStore(
    subscribe,
    getUnreadFunCount,
    getServerUnreadCount,
  );

  const unreadMarkets = useSyncExternalStore(
    subscribe,
    getUnreadFunMarketsSnapshot,
    getServerUnreadMarkets,
  );

  const registerUnread = useCallback((entry: UnreadFunMarket) => {
    addUnreadFunMarket(entry);
    notifyStorageChange();
  }, []);

  const markMarketsSeenHandler = useCallback((marketIds: string[]) => {
    markFunMarketsSeen(marketIds);
    notifyStorageChange();
  }, []);

  const markMatchSeenHandler = useCallback((matchId: number) => {
    markFunMatchSeen(matchId);
    notifyStorageChange();
  }, []);

  const value = useMemo(
    () => ({
      unreadCount,
      unreadMarkets,
      registerUnread,
      markMarketsSeen: markMarketsSeenHandler,
      markMatchSeen: markMatchSeenHandler,
    }),
    [
      unreadCount,
      unreadMarkets,
      registerUnread,
      markMarketsSeenHandler,
      markMatchSeenHandler,
    ],
  );

  return (
    <FunBetsNotificationsContext.Provider value={value}>
      {children}
    </FunBetsNotificationsContext.Provider>
  );
}

export function useFunBetsNotificationsContext() {
  const ctx = useContext(FunBetsNotificationsContext);
  if (!ctx) {
    throw new Error(
      "useFunBetsNotificationsContext must be used within FunBetsNotificationsProvider",
    );
  }
  return ctx;
}

export function useFunBetsUnreadCount(): number {
  const ctx = useContext(FunBetsNotificationsContext);
  return ctx?.unreadCount ?? 0;
}
