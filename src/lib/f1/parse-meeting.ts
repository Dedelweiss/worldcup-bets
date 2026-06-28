import type { MatchStatus } from "@/types/database";
import type { OpenF1Meeting, OpenF1Session } from "@/lib/f1/types";

const TESTING_KEYWORDS = ["testing", "test"];

export function isF1TestingMeeting(meeting: OpenF1Meeting): boolean {
  const name = `${meeting.meeting_name} ${meeting.meeting_official_name ?? ""}`.toLowerCase();
  return TESTING_KEYWORDS.some((kw) => name.includes(kw));
}

export function pickRaceSession(
  sessions: OpenF1Session[],
): OpenF1Session | null {
  const races = sessions.filter(
    (s) =>
      !s.is_cancelled &&
      (s.session_type === "Race" || s.session_name === "Race"),
  );
  if (races.length === 0) return null;
  return races.sort(
    (a, b) =>
      new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
  )[0];
}

export function pickQualiSession(
  sessions: OpenF1Session[],
): OpenF1Session | null {
  const qualis = sessions.filter(
    (s) =>
      !s.is_cancelled &&
      (s.session_type === "Qualifying" ||
        s.session_name === "Qualifying" ||
        s.session_name === "Qualifying 1"),
  );
  if (qualis.length === 0) return null;
  return qualis.sort(
    (a, b) =>
      new Date(b.date_start).getTime() - new Date(a.date_start).getTime(),
  )[0];
}

export function mapF1MeetingStatus(params: {
  isCancelled: boolean;
  raceStartAt: string | null;
  raceEndAt: string | null;
  hasOfficialResults: boolean;
  now?: Date;
}): MatchStatus {
  if (params.isCancelled) return "cancelled";
  if (params.hasOfficialResults) return "finished";

  const now = params.now ?? new Date();
  if (params.raceStartAt) {
    const start = new Date(params.raceStartAt).getTime();
    const end = params.raceEndAt
      ? new Date(params.raceEndAt).getTime()
      : start + 2.5 * 60 * 60 * 1000;

    if (now.getTime() >= start && now.getTime() <= end + 30 * 60 * 1000) {
      return "live";
    }
    if (now.getTime() > end + 30 * 60 * 1000 && !params.hasOfficialResults) {
      return "live";
    }
  }

  return "scheduled";
}

export function parseRaceWinnerFromResults(
  results: {
    position: number;
    driver_number: number;
    dnf?: boolean;
    dns?: boolean;
    dsq?: boolean;
  }[],
): number | null {
  const winner = results.find(
    (r) => r.position === 1 && !r.dsq && !r.dns,
  );
  return winner?.driver_number ?? null;
}

export function meetingToDbRow(
  meeting: OpenF1Meeting,
  raceSession: OpenF1Session | null,
  status: MatchStatus,
  winnerDriverNumber: number | null,
  raceResults?: { driver_number: number; position: number }[] | null,
): Record<string, unknown> {
  return {
    meeting_key: meeting.meeting_key,
    year: meeting.year,
    meeting_name: meeting.meeting_name,
    meeting_official_name: meeting.meeting_official_name ?? null,
    location: meeting.location ?? null,
    country_name: meeting.country_name ?? null,
    country_code: meeting.country_code ?? null,
    circuit_key: meeting.circuit_key ?? null,
    circuit_short_name: meeting.circuit_short_name ?? null,
    circuit_image: meeting.circuit_image ?? null,
    date_start: meeting.date_start,
    date_end: meeting.date_end,
    race_session_key: raceSession?.session_key ?? null,
    race_start_at: raceSession?.date_start ?? null,
    status,
    winner_driver_number: winnerDriverNumber,
    race_results: raceResults ?? null,
    is_cancelled: Boolean(meeting.is_cancelled),
    updated_at: new Date().toISOString(),
  };
}

export function sessionResultsToRaceResults(
  results: { driver_number: number; position: number }[],
): { driver_number: number; position: number }[] {
  return results
    .filter((r) => r.position > 0 && r.driver_number > 0)
    .map((r) => ({ driver_number: r.driver_number, position: r.position }));
}

export function dedupeDriversByNumber<T extends { driver_number: number }>(
  drivers: T[],
): T[] {
  const map = new Map<number, T>();
  for (const d of drivers) {
    map.set(d.driver_number, d);
  }
  return [...map.values()];
}

export function latestPositionsByDriver(
  positions: { date: string; driver_number: number; position: number }[],
): Map<number, { position: number; date: string }> {
  const map = new Map<number, { position: number; date: string }>();
  for (const p of positions) {
    const prev = map.get(p.driver_number);
    if (!prev || new Date(p.date) > new Date(prev.date)) {
      map.set(p.driver_number, { position: p.position, date: p.date });
    }
  }
  return map;
}

export function latestRaceControlFlag(
  events: { date: string; flag?: string | null; message?: string }[],
): { flag: string | null; message: string | null } {
  if (events.length === 0) {
    return { flag: null, message: null };
  }
  const sorted = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const latest = sorted[0];
  return {
    flag: latest.flag ?? null,
    message: latest.message ?? null,
  };
}

export function flagLabel(flag: string | null): string {
  switch (flag?.toUpperCase()) {
    case "GREEN":
      return "Drapeau vert";
    case "YELLOW":
      return "Drapeau jaune";
    case "DOUBLE YELLOW":
      return "Double drapeau jaune";
    case "RED":
      return "Drapeau rouge";
    case "CHEQUERED":
      return "Drapeau à damiers";
    default:
      return flag ?? "Session en cours";
  }
}
