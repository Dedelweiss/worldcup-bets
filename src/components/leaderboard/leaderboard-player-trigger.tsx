"use client";

import type { ReactNode } from "react";
import { useLeaderboardFutCard } from "@/components/leaderboard/leaderboard-fut-card-context";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/database";

interface LeaderboardPlayerTriggerProps {
  player: LeaderboardEntry;
  children: ReactNode;
  className?: string;
}

export function LeaderboardPlayerTrigger({
  player,
  children,
  className,
}: LeaderboardPlayerTriggerProps) {
  const { openPlayerCard } = useLeaderboardFutCard();
  const label = getPlayerLabel(player);

  return (
    <button
      type="button"
      onClick={() => openPlayerCard(player)}
      className={cn(
        "group inline-flex min-w-0 items-center gap-2 rounded-lg text-left transition-colors",
        "hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
      aria-label={`Voir la carte FIFA de ${label}`}
    >
      {children}
    </button>
  );
}
