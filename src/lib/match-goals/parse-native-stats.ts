import {
  detectGoalType,
  mapEventsToSides,
  parseGoalMinute,
  parseScorePair,
  sortGoalEvents,
} from "@/lib/match-goals/types";
import type { MatchGoalEvent } from "@/types/database";

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseNativeStatsMatchGoals(
  html: string,
  homeTeamName: string,
  awayTeamName: string,
): MatchGoalEvent[] {
  const goalsBlock = html.split("<!-- Goals -->")[1]?.split("<!-- Bookings -->")[0];
  if (!goalsBlock) return [];

  const rows = [...goalsBlock.matchAll(/<tr class="text-gray-300">([\s\S]*?)<\/tr>/g)];
  const parsed: Omit<MatchGoalEvent, "teamSide">[] = [];

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) =>
      stripTags(c[1]),
    );
    if (cells.length < 5) continue;

    const [minuteRaw, teamName, scorerRaw, assistRaw, scoreRaw] = cells;
    if (!minuteRaw || !teamName || !scorerRaw) continue;

    const scorerLower = scorerRaw.toLowerCase();
    if (scorerLower === "unknown" || scorerLower === "-") continue;

    const { name, type } = detectGoalType(scorerRaw);
    const minute = parseGoalMinute(minuteRaw);
    const assist =
      !assistRaw || assistRaw === "-" || assistRaw.toLowerCase() === "unknown"
        ? null
        : assistRaw;

    parsed.push({
      minute: minute.display,
      minuteSort: minute.sort,
      teamName,
      scorerName: name,
      assistName: assist,
      scoreAfter: parseScorePair(scoreRaw ?? ""),
      type,
    });
  }

  if (parsed.length > 0) {
    return sortGoalEvents(mapEventsToSides(parsed, homeTeamName, awayTeamName));
  }

  return [];
}

export function nativeStatsMatchUrl(footballDataId: number): string {
  return `https://native-stats.org/match/${footballDataId}/`;
}

export async function fetchNativeStatsMatchHtml(
  footballDataId: number,
): Promise<string | null> {
  const { GOAL_EVENTS_USER_AGENT } = await import("@/lib/match-goals/types");
  try {
    const res = await fetch(nativeStatsMatchUrl(footballDataId), {
      headers: { "User-Agent": GOAL_EVENTS_USER_AGENT },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
