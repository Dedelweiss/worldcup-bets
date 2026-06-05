"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PlayerFutCardModal } from "@/components/leaderboard/player-fut-card-modal";
import { getPlayerLabel } from "@/lib/profile/player-label";
import type { LeaderboardEntry } from "@/types/database";

interface LeaderboardFutCardContextValue {
  openPlayerCard: (player: LeaderboardEntry) => void;
}

const LeaderboardFutCardContext =
  createContext<LeaderboardFutCardContextValue | null>(null);

export function LeaderboardFutCardProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<LeaderboardEntry | null>(null);

  const openPlayerCard = useCallback((entry: LeaderboardEntry) => {
    setPlayer(entry);
  }, []);

  const value = useMemo(
    () => ({ openPlayerCard }),
    [openPlayerCard],
  );

  return (
    <LeaderboardFutCardContext.Provider value={value}>
      {children}
      <PlayerFutCardModal
        open={player != null}
        userId={player?.id ?? null}
        playerLabel={player ? getPlayerLabel(player) : ""}
        onClose={() => setPlayer(null)}
      />
    </LeaderboardFutCardContext.Provider>
  );
}

export function useLeaderboardFutCard(): LeaderboardFutCardContextValue {
  const ctx = useContext(LeaderboardFutCardContext);
  if (!ctx) {
    throw new Error(
      "useLeaderboardFutCard must be used within LeaderboardFutCardProvider",
    );
  }
  return ctx;
}
