import type { MatchResultSelection } from "@/types/database";

const PICK_VALUES = new Set<MatchResultSelection>(["home", "draw", "away"]);

export function parseMatchResultPick(
  value: string | null | undefined,
): MatchResultSelection | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return PICK_VALUES.has(normalized as MatchResultSelection)
    ? (normalized as MatchResultSelection)
    : null;
}

export function buildMatchPickHref(
  matchId: number,
  pick: MatchResultSelection,
): string {
  return `/matches/${matchId}?pick=${pick}#mon-pronostic`;
}
