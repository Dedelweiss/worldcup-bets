import type { MatchGoalEvent, MatchGoalEventType } from "@/types/database";

export const GOAL_EVENTS_USER_AGENT =
  "worldcup-bets/1.0 (private pool; cached enrichment)";

export const GOAL_EVENTS_SYNC_LIVE_MS = 15 * 60 * 1000;
export const GOAL_EVENTS_SYNC_FINISHED_MS = 6 * 60 * 60 * 1000;
export const MAX_GOAL_EVENTS_SYNCS_PER_CRON = 2;
export const MAX_GOAL_EVENTS_SYNCS_ADMIN = 12;

export function parseGoalMinute(minute: string): {
  display: string;
  sort: number;
} {
  const raw = minute.trim().replace(/'/g, "");
  const plus = raw.match(/^(\d+)\+(\d+)$/);
  if (plus) {
    const base = Number(plus[1]);
    const extra = Number(plus[2]);
    return { display: `${base}+${extra}`, sort: base * 100 + extra };
  }
  const n = Number(raw);
  if (!Number.isNaN(n)) {
    return { display: String(n), sort: n * 100 };
  }
  return { display: raw, sort: 99999 };
}

export function parseScorePair(score: string): { home: number; away: number } | null {
  const m = score.trim().match(/^(\d+)\s*:\s*(\d+)$/);
  if (!m) return null;
  return { home: Number(m[1]), away: Number(m[2]) };
}

export function detectGoalType(scorerName: string): {
  name: string;
  type: MatchGoalEventType;
} {
  const lower = scorerName.toLowerCase();
  if (lower.includes("(o.g.)") || lower.includes("own goal")) {
    return {
      name: scorerName.replace(/\s*\(o\.g\.\)\s*/i, "").trim(),
      type: "own_goal",
    };
  }
  if (lower.includes("(pen.)") || lower.includes("penalty")) {
    return {
      name: scorerName.replace(/\s*\(pen\.\)\s*/i, "").trim(),
      type: "penalty",
    };
  }
  return { name: scorerName.trim(), type: "regular" };
}

export function sortGoalEvents(events: MatchGoalEvent[]): MatchGoalEvent[] {
  return [...events].sort((a, b) => a.minuteSort - b.minuteSort);
}

export function normalizeTeamLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function teamNamesLooselyMatch(a: string, b: string): boolean {
  const na = normalizeTeamLabel(a);
  const nb = normalizeTeamLabel(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

export function mapEventsToSides(
  events: Omit<MatchGoalEvent, "teamSide">[],
  homeTeamName: string,
  awayTeamName: string,
): MatchGoalEvent[] {
  return events.map((event) => {
    const isHome = teamNamesLooselyMatch(event.teamName, homeTeamName);
    const isAway = teamNamesLooselyMatch(event.teamName, awayTeamName);
    return {
      ...event,
      teamSide: isHome && !isAway ? "home" : isAway && !isHome ? "away" : "home",
    };
  });
}
