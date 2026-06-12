const CELEBRATION_STORAGE_KEY = "wc2026-last-celebrated-bet";

export function readCelebratedBetId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CELEBRATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function markBetCelebrated(betId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CELEBRATION_STORAGE_KEY, betId);
  } catch {
    // ignore quota / private mode
  }
}

/** Confettis uniquement pour la dernière victoire, une seule fois. */
export function shouldCelebrateWin(
  betId: string,
  latestWinId: string | null,
): boolean {
  if (!latestWinId || betId !== latestWinId) return false;
  return readCelebratedBetId() !== betId;
}
