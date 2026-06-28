import { addHours } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

const PARIS_TZ = "Europe/Paris";
const MATCH_DURATION_HOURS = 2;

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toGoogleCalendarUtc(isoDate: string): string {
  return formatInTimeZone(new Date(isoDate), "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

export interface MatchCalendarEventInput {
  id: number;
  kickoff_at: string;
  venue: string | null;
  round: string | null;
  home_team: { name: string };
  away_team: { name: string };
}

function matchTitle(match: MatchCalendarEventInput): string {
  return `${match.home_team.name} – ${match.away_team.name}`;
}

function matchDescription(match: MatchCalendarEventInput, pageUrl: string): string {
  const lines = [
    match.round,
    "Coupe du Monde 2026 — World Cup Bets",
    pageUrl,
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildGoogleCalendarUrl(
  match: MatchCalendarEventInput,
  pageUrl: string,
): string {
  const start = new Date(match.kickoff_at);
  const end = addHours(start, MATCH_DURATION_HOURS);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: matchTitle(match),
    dates: `${toGoogleCalendarUtc(match.kickoff_at)}/${toGoogleCalendarUtc(end.toISOString())}`,
    details: matchDescription(match, pageUrl),
  });
  if (match.venue) params.set("location", match.venue);
  params.set("ctz", PARIS_TZ);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildMatchIcs(
  match: MatchCalendarEventInput,
  pageUrl: string,
): string {
  const start = new Date(match.kickoff_at);
  const end = addHours(start, MATCH_DURATION_HOURS);
  const now = formatInTimeZone(new Date(), "UTC", "yyyyMMdd'T'HHmmss'Z'");
  const uid = `wc2026-match-${match.id}@worldcup-bets`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//World Cup Bets//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toGoogleCalendarUtc(match.kickoff_at)}`,
    `DTEND:${toGoogleCalendarUtc(end.toISOString())}`,
    `SUMMARY:${escapeIcsText(matchTitle(match))}`,
    `DESCRIPTION:${escapeIcsText(matchDescription(match, pageUrl))}`,
    match.venue ? `LOCATION:${escapeIcsText(match.venue)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadMatchIcs(
  match: MatchCalendarEventInput,
  pageUrl: string,
): void {
  const ics = buildMatchIcs(match, pageUrl);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `match-${match.id}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
