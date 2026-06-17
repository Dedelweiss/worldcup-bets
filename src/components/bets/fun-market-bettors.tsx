"use client";

import { Users } from "lucide-react";
import { AiPlayerBadge } from "@/components/leaderboard/ai-player-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FunMarketParticipant } from "@/lib/bets/fun-market-participation";
import {
  getPlayerInitials,
  getPlayerLabel,
} from "@/lib/profile/player-label";
import { cn } from "@/lib/utils";

interface FunMarketBettorsProps {
  participants: FunMarketParticipant[];
  currentUserId: string;
  className?: string;
}

export function FunMarketBettors({
  participants,
  currentUserId,
  className,
}: FunMarketBettorsProps) {
  if (participants.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-border/50 pt-3",
        className,
      )}
    >
      <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-xs text-muted-foreground tabular-nums">
        {participants.length} joueur{participants.length > 1 ? "s" : ""}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {participants.map((player) => {
          const label = getPlayerLabel(player);
          const initials = getPlayerInitials(player);
          const isCurrentUser = player.user_id === currentUserId;

          return (
            <Tooltip key={player.user_id}>
              <TooltipTrigger
                type="button"
                className={cn(
                  "rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isCurrentUser &&
                    "ring-2 ring-primary ring-offset-1 ring-offset-background",
                )}
                aria-label={`${label}${isCurrentUser ? " (vous)" : ""} — a parié`}
              >
                <Avatar
                  size="sm"
                  className="size-7 border border-emerald-500/50 bg-emerald-500/10"
                >
                  {player.avatar_url ? (
                    <AvatarImage src={player.avatar_url} alt="" />
                  ) : null}
                  <AvatarFallback className="text-[9px] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-medium">
                  {label}
                  {player.is_ai && (
                    <span className="ml-1.5 inline-flex align-middle">
                      <AiPlayerBadge />
                    </span>
                  )}
                  {isCurrentUser && (
                    <span className="ml-1 font-normal text-background/70">
                      (vous)
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-background/80">
                  A parié sur ce marché
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
