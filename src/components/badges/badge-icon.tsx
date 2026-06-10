import { getBadgeIcon } from "@/lib/badges";
import {
  getBadgeIconClasses,
  getBadgeIconInnerClasses,
  parseBadgeRarity,
  type BadgeVisualSize,
} from "@/lib/badge-rarity";
import { cn } from "@/lib/utils";

interface BadgeIconProps {
  iconName: string;
  rarity?: string | null;
  size?: BadgeVisualSize;
  className?: string;
  /** Accessible label when rendered as decorative inside a labeled control. */
  decorative?: boolean;
}

export function BadgeIcon({
  iconName,
  rarity,
  size = "sm",
  className,
  decorative = true,
}: BadgeIconProps) {
  const Icon = getBadgeIcon(iconName);
  const parsedRarity = parseBadgeRarity(rarity);

  return (
    <span
      className={cn(getBadgeIconClasses(parsedRarity, size), className)}
      aria-hidden={decorative ? true : undefined}
    >
      <Icon className={getBadgeIconInnerClasses(size)} aria-hidden />
    </span>
  );
}
