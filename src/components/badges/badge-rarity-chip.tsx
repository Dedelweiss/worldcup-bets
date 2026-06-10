import {
  BADGE_RARITY_LABELS,
  getBadgeRarityChipClasses,
  parseBadgeRarity,
} from "@/lib/badge-rarity";
import { cn } from "@/lib/utils";

interface BadgeRarityChipProps {
  rarity?: string | null;
  className?: string;
}

export function BadgeRarityChip({ rarity, className }: BadgeRarityChipProps) {
  const parsed = parseBadgeRarity(rarity);

  return (
    <span className={cn(getBadgeRarityChipClasses(parsed), className)}>
      {BADGE_RARITY_LABELS[parsed]}
    </span>
  );
}
