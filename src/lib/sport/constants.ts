export type ActiveSport = "football" | "f1";

export const ACTIVE_SPORT_COOKIE = "active_sport";
export const ACTIVE_SPORT_STORAGE_KEY = "wc2026_active_sport";

export const F1_SEASON_YEAR = 2026;

export const SPORT_LABELS: Record<ActiveSport, { short: string; emoji: string }> = {
  football: { short: "CDM 2026", emoji: "⚽" },
  f1: { short: "F1", emoji: "🏎️" },
};

export function isActiveSport(value: string | null | undefined): value is ActiveSport {
  return value === "football" || value === "f1";
}

export function parseActiveSport(value: string | null | undefined): ActiveSport {
  return isActiveSport(value) ? value : "football";
}

export function sportHomePath(sport: ActiveSport): string {
  return sport === "f1" ? "/f1" : "/dashboard";
}
