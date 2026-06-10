"use client";

import { useEffect, useState } from "react";
import { BadgeRarityChip } from "@/components/badges/badge-rarity-chip";
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
import {
  getBadgeIconClasses,
  getBadgeIconInnerClasses,
  parseBadgeRarity,
} from "@/lib/badge-rarity";
import { getBadgeIcon, type PlayerBadge } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface PlayerBadgesProps {
  badges: PlayerBadge[];
  className?: string;
}

const contentClassName =
  "max-w-[min(220px,calc(100vw-2rem))] text-left text-sm";

const triggerExtras =
  "cursor-pointer transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation";

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
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <p className="font-medium">{badge.name}</p>
        <BadgeRarityChip rarity={badge.rarity} />
      </div>
      <p className="text-muted-foreground">{badge.description}</p>
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
  const rarity = parseBadgeRarity(badge.rarity);
  const triggerClassName = cn(getBadgeIconClasses(rarity, "sm"), triggerExtras);

  const icon = <Icon className={getBadgeIconInnerClasses("sm")} aria-hidden />;

  if (prefersHover) {
    return (
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={triggerClassName}
          aria-label={badge.name}
        >
          {icon}
        </TooltipTrigger>
        <TooltipContent side="top" className={contentClassName}>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="font-medium">{badge.name}</p>
            <BadgeRarityChip rarity={badge.rarity} />
          </div>
          <p className="text-background/80">{badge.description}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={triggerClassName} aria-label={badge.name}>
        {icon}
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
