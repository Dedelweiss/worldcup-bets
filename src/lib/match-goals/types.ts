import { footballDataTlaForOurCode } from "@/lib/football-data/team-tla";
import type { MatchGoalEvent, MatchGoalEventType } from "@/types/database";

export const GOAL_EVENTS_USER_AGENT =
  "worldcup-bets/1.0 (private pool; cached enrichment)";

export const GOAL_EVENTS_SYNC_LIVE_MS = 15 * 60 * 1000;
export const GOAL_EVENTS_SYNC_FINISHED_MS = 6 * 60 * 60 * 1000;
export const MAX_GOAL_EVENTS_SYNCS_PER_CRON = 2;
export const MAX_GOAL_EVENTS_SYNCS_ADMIN = 12;

export interface GoalEventTeamRef {
  name: string;
  code: string | null;
}

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

/** @deprecated Préférer teamLabelMatchesTeam — la comparaison par sous-chaîne est source d'erreurs (ex. IQ dans Iraq, NO dans Norway). */
export function teamNamesLooselyMatch(a: string, b: string): boolean {
  const na = normalizeTeamLabel(a);
  const nb = normalizeTeamLabel(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length < 4 || nb.length < 4) return false;
  return na.includes(nb) || nb.includes(na);
}

function aliasesForTeam(team: GoalEventTeamRef): Set<string> {
  const aliases = new Set<string>();
  const add = (value: string | null | undefined) => {
    const normalized = normalizeTeamLabel(value ?? "");
    if (normalized) aliases.add(normalized);
  };

  add(team.name);
  add(team.code);
  add(footballDataTlaForOurCode(team.code));
  return aliases;
}

export function teamLabelMatchesTeam(
  label: string,
  team: GoalEventTeamRef,
): boolean {
  const raw = label.trim();
  if (!raw) return false;

  const normalizedLabel = normalizeTeamLabel(raw);
  const upperLabel = raw.toUpperCase();
  const aliases = aliasesForTeam(team);

  if (aliases.has(normalizedLabel)) return true;
  if (team.code && upperLabel === team.code.toUpperCase()) return true;

  const tla = footballDataTlaForOurCode(team.code);
  if (tla && upperLabel === tla) return true;

  const normalizedName = normalizeTeamLabel(team.name);
  if (
    normalizedLabel.length >= 5 &&
    normalizedName &&
    (normalizedName === normalizedLabel ||
      normalizedName.startsWith(normalizedLabel) ||
      normalizedLabel.startsWith(normalizedName))
  ) {
    return true;
  }

  return false;
}

export function resolveGoalTeamSide(
  teamLabel: string,
  home: GoalEventTeamRef,
  away: GoalEventTeamRef,
): "home" | "away" | null {
  const homeMatch = teamLabelMatchesTeam(teamLabel, home);
  const awayMatch = teamLabelMatchesTeam(teamLabel, away);
  if (homeMatch && !awayMatch) return "home";
  if (awayMatch && !homeMatch) return "away";
  return null;
}

function inferSideFromScoreDelta(
  scoreAfter: { home: number; away: number },
  prev: { home: number; away: number },
): "home" | "away" | null {
  const dh = scoreAfter.home - prev.home;
  const da = scoreAfter.away - prev.away;
  if (dh >= 1 && da === 0) return "home";
  if (da >= 1 && dh === 0) return "away";
  return null;
}

export function mapEventsToSides(
  events: Omit<MatchGoalEvent, "teamSide">[],
  home: GoalEventTeamRef,
  away: GoalEventTeamRef,
): MatchGoalEvent[] {
  const ordered = [...events].sort((a, b) => a.minuteSort - b.minuteSort);
  let prevScore = { home: 0, away: 0 };

  return ordered.map((event) => {
    let side: "home" | "away" | null = null;

    if (event.scoreAfter) {
      side = inferSideFromScoreDelta(event.scoreAfter, prevScore);
      prevScore = event.scoreAfter;
    }

    if (!side) {
      side = resolveGoalTeamSide(event.teamName, home, away);
    }

    return {
      ...event,
      teamSide: side ?? "home",
    };
  });
}
