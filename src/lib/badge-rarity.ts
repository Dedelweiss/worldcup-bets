import { cn } from "@/lib/utils";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export const BADGE_RARITY_ORDER: BadgeRarity[] = [
  "legendary",
  "epic",
  "rare",
  "common",
];

export const BADGE_RARITY_LABELS: Record<BadgeRarity, string> = {
  common: "Commun",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
};

export function parseBadgeRarity(value: string | null | undefined): BadgeRarity {
  if (value === "rare" || value === "epic" || value === "legendary") {
    return value;
  }
  return "common";
}

export type BadgeVisualSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<
  BadgeVisualSize,
  { container: string; icon: string }
> = {
  xs: { container: "size-6", icon: "size-3" },
  sm: { container: "size-7", icon: "size-3.5" },
  md: { container: "size-10", icon: "size-5" },
  lg: { container: "size-12", icon: "size-6" },
};

const RARITY_CONTAINER: Record<BadgeRarity, string> = {
  common:
    "border-zinc-500/35 bg-zinc-500/10 text-zinc-300 ring-1 ring-zinc-500/25 shadow-sm",
  rare: "border-sky-400/50 bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/40 shadow-sm shadow-sky-500/20",
  epic: "border-violet-400/55 bg-gradient-to-b from-violet-500/25 to-violet-950/40 text-violet-200 ring-1 ring-violet-400/45 shadow-md shadow-violet-500/25",
  legendary:
    "border-amber-400/60 bg-gradient-to-b from-amber-400/30 via-amber-500/15 to-amber-950/50 text-amber-200 ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/30 badge-legendary-shimmer",
};

const RARITY_SLOT: Record<BadgeRarity, string> = {
  common:
    "border-zinc-500/30 bg-gradient-to-b from-zinc-500/10 to-zinc-950/80 shadow-md shadow-zinc-900/40",
  rare: "border-sky-400/45 bg-gradient-to-b from-sky-500/20 to-zinc-950/80 shadow-lg shadow-sky-500/15",
  epic: "border-violet-400/50 bg-gradient-to-b from-violet-500/25 to-zinc-950/80 shadow-lg shadow-violet-500/20",
  legendary:
    "border-amber-400/55 bg-gradient-to-b from-amber-400/25 to-zinc-950/80 shadow-xl shadow-amber-500/25 badge-legendary-shimmer",
};

const RARITY_CHIP: Record<BadgeRarity, string> = {
  common: "border-zinc-500/30 bg-zinc-500/15 text-zinc-300",
  rare: "border-sky-400/35 bg-sky-500/15 text-sky-300",
  epic: "border-violet-400/40 bg-violet-500/15 text-violet-200",
  legendary: "border-amber-400/45 bg-amber-500/15 text-amber-200",
};

const RARITY_GRID_BORDER: Record<BadgeRarity, string> = {
  common: "border-white/10 hover:border-zinc-400/35",
  rare: "border-sky-500/25 hover:border-sky-400/45 hover:shadow-sky-500/10",
  epic: "border-violet-500/30 hover:border-violet-400/50 hover:shadow-violet-500/15",
  legendary:
    "border-amber-500/35 hover:border-amber-400/55 hover:shadow-amber-500/20",
};

export function getBadgeIconClasses(
  rarity: BadgeRarity,
  size: BadgeVisualSize = "sm",
): string {
  const sizes = SIZE_CLASSES[size];
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-full border transition-colors",
    sizes.container,
    RARITY_CONTAINER[rarity],
  );
}

export function getBadgeIconInnerClasses(size: BadgeVisualSize = "sm"): string {
  return SIZE_CLASSES[size].icon;
}

export function getBadgeSlotClasses(rarity: BadgeRarity): string {
  return cn(
    "flex aspect-square w-full flex-col items-center justify-center rounded-xl sm:rounded-2xl border",
    RARITY_SLOT[rarity],
  );
}

export function getBadgeRarityChipClasses(rarity: BadgeRarity): string {
  return cn(
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
    RARITY_CHIP[rarity],
  );
}

export function getBadgeGridBorderClasses(rarity: BadgeRarity): string {
  return RARITY_GRID_BORDER[rarity];
}
