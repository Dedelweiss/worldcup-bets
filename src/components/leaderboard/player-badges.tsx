"use client";

import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const triggerClassName = cn(
  "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 transition-colors",
  "hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "touch-manipulation",
);

const contentClassName =
  "max-w-[min(220px,calc(100vw-2rem))] text-left text-sm";

function usePrefersFinePointerHover(): boolean {
  const [prefersHover, setPrefersHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setPrefersHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return prefersHover;
}

function BadgeDetails({ badge }: { badge: PlayerBadge }) {
  return (
    <>
      <p className="font-medium">{badge.name}</p>
      <p className="mt-0.5 text-muted-foreground">{badge.description}</p>
    </>
  );
}

function PlayerBadgeItem({
  badge,
  prefersHover,
}: {
  badge: PlayerBadge;
  prefersHover: boolean;
}) {
  const [open, setOpen] = useState(false);
  const Icon = getBadgeIcon(badge.icon_name);

  if (prefersHover) {
    return (
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={triggerClassName}
          aria-label={badge.name}
        >
          <Icon className="size-3.5" aria-hidden />
        </TooltipTrigger>
        <TooltipContent side="top" className={contentClassName}>
          <p className="font-medium">{badge.name}</p>
          <p className="mt-0.5 text-background/80">{badge.description}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={triggerClassName} aria-label={badge.name}>
        <Icon className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className={contentClassName}>
        <BadgeDetails badge={badge} />
      </PopoverContent>
    </Popover>
  );
}

/** Succès affichés sur le classement — tooltip au survol, popover au tap (mobile). */
export function PlayerBadges({ badges, className }: PlayerBadgesProps) {
  const prefersHover = usePrefersFinePointerHover();

  if (badges.length === 0) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1", className)}
      aria-label={`${badges.length} succès débloqué(s)`}
    >
      {badges.map((badge) => (
        <PlayerBadgeItem
          key={badge.id}
          badge={badge}
          prefersHover={prefersHover}
        />
      ))}
    </div>
  );
}
