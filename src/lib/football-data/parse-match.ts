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

export function formatLiveClock(
  minute: number | null | undefined,
  injuryTime: number | null | undefined,
): string | null {
  if (minute == null || minute < 0) return null;
  if (injuryTime != null && injuryTime > 0) {
    return `${minute}'+${injuryTime}`;
  }
  return `${minute}'`;
}
