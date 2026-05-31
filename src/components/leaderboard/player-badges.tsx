"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getBadgeIcon, type PlayerBadge } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface PlayerBadgesProps {
  badges: PlayerBadge[];
  className?: string;
}

export function PlayerBadges({ badges, className }: PlayerBadgesProps) {
  if (badges.length === 0) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1", className)}
      aria-label={`${badges.length} succès débloqué(s)`}
    >
      {badges.map((badge) => {
        const Icon = getBadgeIcon(badge.icon_name);
        return (
          <Tooltip key={badge.id}>
            <TooltipTrigger
              type="button"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={badge.name}
            >
              <Icon className="size-3.5" aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-left">
              <p className="font-medium">{badge.name}</p>
              <p className="mt-0.5 text-background/80">{badge.description}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
