import { cn } from "@/lib/utils";

/** Multiplicateur appliqué à la clôture sur tous les gains du match. */
export const GOLDEN_MATCH_MULTIPLIER = 2;

export function goldenMatchPoints(base: number, isGolden = false): number {
  return isGolden ? base * GOLDEN_MATCH_MULTIPLIER : base;
}

export function goldenMatchCardClass(isGolden: boolean, isLive = false): string {
  return cn(
    isGolden &&
      "border-fuchsia-500/80 ring-2 ring-fuchsia-500/50 shadow-[0_0_20px_-4px] shadow-fuchsia-500/30 animate-golden-border md:hover:border-fuchsia-400/70",
    isLive && !isGolden && "border-primary ring-2 ring-primary/30 animate-pulse",
    isLive &&
      isGolden &&
      "border-fuchsia-400 ring-fuchsia-400/60 shadow-fuchsia-500/40",
  );
}

export function goldenMatchHeaderClass(isGolden: boolean): string {
  return cn(
    isGolden &&
      "animate-golden-border rounded-xl border border-fuchsia-500/40 bg-gradient-to-b from-fuchsia-500/15 to-transparent px-4 py-3",
  );
}
