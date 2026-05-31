"use client";

import { Check, Sparkles } from "lucide-react";
import { useFunBetsNotificationsContext } from "@/components/fun-bets/fun-bets-notifications-context";
import { Badge } from "@/components/ui/badge";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import { cn } from "@/lib/utils";

interface MatchCardStatusBadgesProps {
  matchId: number;
  status?: UserMatchBetStatus;
  className?: string;
}

export function MatchCardStatusBadges({
  matchId,
  status,
  className,
}: MatchCardStatusBadgesProps) {
  const { unreadMarkets } = useFunBetsNotificationsContext();
  const unreadOnMatch = unreadMarkets.filter((m) => m.matchId === matchId).length;
  const showClassic = status?.hasClassicBet ?? false;
  const funToPlay = showClassic
    ? Math.max(status?.pendingFunToPlay ?? 0, unreadOnMatch)
    : 0;
  const showFunAlert = showClassic && funToPlay > 0;

  if (!showClassic && !showFunAlert) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {showClassic && (
        <Badge
          variant="outline"
          className="gap-0.5 border-primary/50 bg-primary/10 text-[10px] text-primary"
        >
          <Check className="size-3" aria-hidden />
          Pronostic enregistré
        </Badge>
      )}
      {showFunAlert && (
        <Badge
          className={cn(
            "gap-0.5 border-amber-500/50 bg-amber-500/20 text-[10px] font-semibold text-amber-950 dark:text-amber-100",
            unreadOnMatch > 0 && "animate-pulse",
          )}
        >
          <Sparkles className="size-3 text-amber-600" aria-hidden />
          {funToPlay === 1 ? "Pari fun à jouer" : `${funToPlay} paris fun`}
        </Badge>
      )}
    </div>
  );
}
