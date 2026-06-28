import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

const PARIS_TZ = "Europe/Paris";

export const WEEKDAY_LABELS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;

export function getParisDayKey(isoOrDate: string | Date): string {
  return formatInTimeZone(new Date(isoOrDate), PARIS_TZ, "yyyy-MM-dd");
}

export function getParisTodayKey(): string {
  return formatInTimeZone(new Date(), PARIS_TZ, "yyyy-MM-dd");
}

export function getParisMonthKey(month: Date): string {
  return formatInTimeZone(toZonedTime(month, PARIS_TZ), PARIS_TZ, "yyyy-MM");
}

export function formatMatchTimeParis(isoDate: string): string {
  return formatInTimeZone(new Date(isoDate), PARIS_TZ, "HH:mm");
}

export function formatMonthLabel(month: Date): string {
  const zoned = toZonedTime(month, PARIS_TZ);
  return format(zoned, "MMMM yyyy", { locale: fr });
}

export function formatDayOfMonth(dayKey: string): string {
  return formatInTimeZone(parseDayKey(dayKey), PARIS_TZ, "d");
}

function parseDayKey(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00`);
}

/** Clés jour (yyyy-MM-dd) pour chaque case de la grille lun–dim. */
export function buildMonthGrid(month: Date): string[] {
  const zoned = toZonedTime(month, PARIS_TZ);
  const monthStart = startOfMonth(zoned);
  const monthEnd = endOfMonth(zoned);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((day) =>
    getParisDayKey(day),
  );
}

export function isDayInMonth(dayKey: string, month: Date): boolean {
  return dayKey.startsWith(getParisMonthKey(month));
}

export function shiftMonth(month: Date, delta: number): Date {
  return addMonths(toZonedTime(month, PARIS_TZ), delta);
}

export function defaultCalendarMonth<T extends { kickoff_at: string }>(
  matches: T[],
): Date {
  const now = toZonedTime(new Date(), PARIS_TZ);
  const todayMonthKey = getParisMonthKey(now);
  const hasMatchThisMonth = matches.some((m) =>
    getParisDayKey(m.kickoff_at).startsWith(todayMonthKey),
  );
  if (hasMatchThisMonth) return startOfMonth(now);
  if (matches.length > 0) {
    return startOfMonth(toZonedTime(new Date(matches[0]!.kickoff_at), PARIS_TZ));
  }
  return startOfMonth(now);
}

export function groupMatchesByDayKey<T extends { kickoff_at: string }>(
  matches: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const match of matches) {
    const key = getParisDayKey(match.kickoff_at);
    const bucket = map.get(key);
    if (bucket) bucket.push(match);
    else map.set(key, [match]);
  }
  for (const [key, list] of map) {
    list.sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
    );
    map.set(key, list);
  }
  return map;
}
