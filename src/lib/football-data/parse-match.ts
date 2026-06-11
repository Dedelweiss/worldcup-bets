import type { MatchStatus } from "@/types/database";
import type { FootballDataMatch } from "@/lib/football-data/types";

export function mapFootballDataStatus(apiStatus: string): MatchStatus | null {
  switch (apiStatus) {
    case "SCHEDULED":
    case "TIMED":
      return "scheduled";
    case "IN_PLAY":
    case "PAUSED":
      return "live";
    case "FINISHED":
    case "AWARDED":
      return "finished";
    case "POSTPONED":
      return "postponed";
    case "CANCELLED":
    case "SUSPENDED":
      return "cancelled";
    default:
      return null;
  }
}

/** Évite de rétrograder live/finished quand l'API football-data est en retard (TIMED/SCHEDULED). */
export function shouldApplyFootballDataStatus(
  localStatus: MatchStatus,
  mappedStatus: MatchStatus,
  suppressAutoLive: boolean,
): boolean {
  if (mappedStatus === localStatus) return false;

  if (mappedStatus === "postponed" || mappedStatus === "cancelled") {
    return true;
  }

  if (mappedStatus === "live" || mappedStatus === "finished") {
    return true;
  }

  if (mappedStatus === "scheduled") {
    if (localStatus === "live" || localStatus === "finished") {
      return false;
    }
    return localStatus === "scheduled" || suppressAutoLive;
  }

  return false;
}

export function parseFootballDataScore(
  match: FootballDataMatch,
): { home: number; away: number } | null {
  const parts = [
    match.score?.fullTime,
    match.score?.regularTime,
    match.score?.halfTime,
  ];
  for (const part of parts) {
    if (part?.home != null && part?.away != null) {
      return { home: part.home, away: part.away };
    }
  }

  const goals = match.goals;
  if (goals?.length) {
    const last = goals[goals.length - 1]?.score;
    if (last?.home != null && last?.away != null) {
      return { home: last.home, away: last.away };
    }
  }

  return null;
}

/** Applique le score API sur nos colonnes domicile/extérieur (gère inversion seed vs API). */
export function mapFootballDataScoreToLocal(
  score: { home: number; away: number },
  swapSides: boolean,
): { home_score: number; away_score: number } {
  return swapSides
    ? { home_score: score.away, away_score: score.home }
    : { home_score: score.home, away_score: score.away };
}

export function parseFootballDataOdds(
  match: FootballDataMatch,
): { home: number; draw: number; away: number } | null {
  const o = match.odds;
  if (
    o?.homeWin == null ||
    o?.draw == null ||
    o?.awayWin == null ||
    Number.isNaN(o.homeWin) ||
    Number.isNaN(o.draw) ||
    Number.isNaN(o.awayWin)
  ) {
    return null;
  }
  return {
    home: Number(o.homeWin),
    draw: Number(o.draw),
    away: Number(o.awayWin),
  };
}

export type LiveClockPhase =
  | "first_half"
  | "half_time"
  | "second_half"
  | "extra_time";

export type LiveClockParts = {
  minute: number;
  injuryTime: number | null;
  phase: LiveClockPhase;
  phaseLabel: string;
  displayMinute: number;
  isStoppageTime: boolean;
  /** Minute déduite du coup d'envoi (API indisponible). */
  isEstimated?: boolean;
};

const HALFTIME_BREAK_MIN = 15;

/** Minute courante à partir d'une ancre admin (minute de base + temps écoulé). */
export function resolveManualLiveMinute(
  baseMinute: number,
  anchorAt: string,
  now = Date.now(),
): number {
  const elapsedMin = Math.floor(
    (now - new Date(anchorAt).getTime()) / 60_000,
  );
  return Math.max(0, baseMinute + elapsedMin);
}

/** Estime la minute de jeu à partir du coup d'envoi (pause ~15 min). */
export function estimateLiveMinute(
  kickoffAt: string,
  now = Date.now(),
): number | null {
  const elapsedMin = Math.floor(
    (now - new Date(kickoffAt).getTime()) / 60_000,
  );
  if (elapsedMin < 0) return null;
  if (elapsedMin === 0) return 1;
  if (elapsedMin <= 45) return elapsedMin;
  if (elapsedMin < 45 + HALFTIME_BREAK_MIN) return 45;
  const secondHalf = elapsedMin - 45 - HALFTIME_BREAK_MIN;
  return Math.min(90, 46 + secondHalf);
}

function isHalfTimeWindow(kickoffAt: string, now: number): boolean {
  const elapsedMin = Math.floor(
    (now - new Date(kickoffAt).getTime()) / 60_000,
  );
  return elapsedMin > 45 && elapsedMin < 45 + HALFTIME_BREAK_MIN;
}

/** Minute API en priorité, sinon estimation depuis le coup d'envoi. */
export function resolveLiveClock(options: {
  kickoffAt: string;
  minute?: number | null;
  injuryTime?: number | null;
  clockAnchorAt?: string | null;
  clockManual?: boolean;
  now?: number;
}): LiveClockParts | null {
  const now = options.now ?? Date.now();
  const { kickoffAt, minute, injuryTime, clockAnchorAt, clockManual } = options;

  if (clockManual && clockAnchorAt) {
    if (minute != null && minute >= 0) {
      const currentMinute = resolveManualLiveMinute(minute, clockAnchorAt, now);
      const parts = parseLiveClock(currentMinute, injuryTime);
      if (!parts) return null;
      return { ...parts, isEstimated: false };
    }

    if (isHalfTimeWindow(clockAnchorAt, now)) {
      return {
        minute: 45,
        injuryTime: null,
        phase: "half_time",
        phaseLabel: "Mi-temps",
        displayMinute: 45,
        isStoppageTime: false,
        isEstimated: true,
      };
    }

    const estimated = estimateLiveMinute(clockAnchorAt, now);
    if (estimated != null) {
      const parts = parseLiveClock(estimated, null);
      if (parts) return { ...parts, isEstimated: true };
    }
  }

  if (minute != null && minute >= 0) {
    return parseLiveClock(minute, injuryTime) ?? null;
  }

  if (isHalfTimeWindow(kickoffAt, now)) {
    return {
      minute: 45,
      injuryTime: null,
      phase: "half_time",
      phaseLabel: "Mi-temps",
      displayMinute: 45,
      isStoppageTime: false,
      isEstimated: true,
    };
  }

  const estimated = estimateLiveMinute(kickoffAt, now);
  if (estimated == null) return null;

  const parts = parseLiveClock(estimated, null);
  if (!parts) return null;
  return { ...parts, isEstimated: true };
}

/** Décompose le temps de jeu pour un rendu type diffusion TV. */
export function parseLiveClock(
  minute: number | null | undefined,
  injuryTime: number | null | undefined,
): LiveClockParts | null {
  if (minute == null || minute < 0) return null;

  const injury = injuryTime != null && injuryTime > 0 ? injuryTime : null;
  const isStoppageTime = injury != null;

  let phase: LiveClockPhase;
  let phaseLabel: string;

  if (minute <= 45) {
    phase = "first_half";
    phaseLabel = "1re mi-temps";
  } else if (minute <= 90) {
    phase = "second_half";
    phaseLabel = "2e mi-temps";
  } else {
    phase = "extra_time";
    phaseLabel = "Prolongations";
  }

  return {
    minute,
    injuryTime: injury,
    phase,
    phaseLabel,
    displayMinute: minute,
    isStoppageTime,
  };
}

export function formatLiveClock(
  minute: number | null | undefined,
  injuryTime: number | null | undefined,
): string | null {
  const parts = parseLiveClock(minute, injuryTime);
  if (!parts) return null;
  if (parts.isStoppageTime && parts.injuryTime != null) {
    return `${parts.displayMinute}'+${parts.injuryTime}`;
  }
  return `${parts.displayMinute}'`;
}
