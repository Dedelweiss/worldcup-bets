import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";

const PARIS_TZ = "Europe/Paris";

/** M73–M104 → id en base (2026073…). */
export function fifaNoFromMatchId(matchId: number): number | null {
  if (matchId < 2_026_073 || matchId > 2_026_104) return null;
  return matchId - 2_026_000;
}

export function fifaMatchId(fifaNo: number): number {
  return 2_026_000 + fifaNo;
}

const KNOCKOUT_MATCHUPS: Record<number, { home: string; away: string }> = {
  73: { home: "2A", away: "2B" },
  74: { home: "1E", away: "3e ABCDF" },
  75: { home: "1F", away: "2C" },
  76: { home: "1C", away: "2F" },
  77: { home: "1I", away: "3e CDFGH" },
  78: { home: "2E", away: "2I" },
  79: { home: "1A", away: "3e CEFHI" },
  80: { home: "1L", away: "3e EHIJK" },
  81: { home: "1D", away: "3e BEFIJ" },
  82: { home: "1G", away: "3e AEHIJ" },
  83: { home: "2K", away: "2L" },
  84: { home: "1H", away: "2J" },
  85: { home: "1B", away: "3e EFGIJ" },
  86: { home: "1J", away: "2H" },
  87: { home: "1K", away: "3e DEIJL" },
  88: { home: "2D", away: "2G" },
  89: { home: "V74", away: "V77" },
  90: { home: "V73", away: "V75" },
  91: { home: "V76", away: "V78" },
  92: { home: "V79", away: "V80" },
  93: { home: "V83", away: "V84" },
  94: { home: "V81", away: "V82" },
  95: { home: "V86", away: "V88" },
  96: { home: "V85", away: "V87" },
  97: { home: "V89", away: "V90" },
  98: { home: "V93", away: "V94" },
  99: { home: "V91", away: "V92" },
  100: { home: "V95", away: "V96" },
  101: { home: "V97", away: "V98" },
  102: { home: "V99", away: "V100" },
  103: { home: "P101", away: "P102" },
  104: { home: "V101", away: "V102" },
};

export interface KnockoutMatchDisplay {
  fifaNo: number;
  title: string;
  home: string;
  away: string;
}

export function getKnockoutMatchDisplay(
  matchId: number,
): KnockoutMatchDisplay | null {
  const fifaNo = fifaNoFromMatchId(matchId);
  if (fifaNo == null) return null;

  const matchup = KNOCKOUT_MATCHUPS[fifaNo];
  if (!matchup) return null;

  return {
    fifaNo,
    title: `N°${fifaNo}`,
    home: matchup.home,
    away: matchup.away,
  };
}

export function formatKnockoutKickoff(isoDate: string): string {
  return formatInTimeZone(new Date(isoDate), PARIS_TZ, "d MMMM — HH:mm", {
    locale: fr,
  });
}

/** Ex. "3e ABCDF" → ["A", "B", "C", "D", "F"] */
export function parseThirdPlacePoolLabel(label: string): string[] | null {
  if (!label.startsWith("3e ")) return null;
  const letters = label.slice(3).trim();
  if (!letters || !/^[A-L]+$/.test(letters)) return null;
  return [...letters];
}

export function getThirdPlacePoolsForMatch(
  matchId: number,
): { home: string[] | null; away: string[] | null } | null {
  const display = getKnockoutMatchDisplay(matchId);
  if (!display) return null;
  return {
    home: parseThirdPlacePoolLabel(display.home),
    away: parseThirdPlacePoolLabel(display.away),
  };
}
