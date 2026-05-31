import { cn } from "@/lib/utils";

/** Multiplicateur appliqué à la clôture sur tous les gains du match. */
export const GOLDEN_MATCH_MULTIPLIER = 2;

export function goldenMatchPoints(base: number, isGolden = false): number {
  return isGolden ? base * GOLDEN_MATCH_MULTIPLIER : base;
}

export function goldenMatchCardClass(isGolden: boolean, isLive = false): string {
  return cn(
    isGolden &&
      "border-amber-400/80 ring-2 ring-amber-400/50 shadow-[0_0_20px_-4px] shadow-amber-500/30 animate-golden-border",
    isLive && !isGolden && "border-primary ring-2 ring-primary/30 animate-pulse",
    isLive &&
      isGolden &&
      "border-amber-400 ring-amber-400/60 shadow-amber-500/40",
  );
}

export function goldenMatchHeaderClass(isGolden: boolean): string {
  return cn(
    isGolden &&
      "border border-amber-400/40 bg-gradient-to-b from-amber-500/15 to-transparent rounded-xl px-4 py-3 animate-golden-border",
  );
}
