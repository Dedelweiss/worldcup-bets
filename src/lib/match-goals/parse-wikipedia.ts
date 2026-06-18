import { footballDataTlaForOurCode } from "@/lib/football-data/team-tla";
import {
  detectGoalType,
  GOAL_EVENTS_USER_AGENT,
  parseGoalMinute,
  sortGoalEvents,
} from "@/lib/match-goals/types";
import type { MatchGoalEvent } from "@/types/database";

interface WikiFootballBox {
  date: string;
  team1Code: string;
  team2Code: string;
  goals1: string;
  goals2: string;
}

const WIKI_FLAG_TO_OUR: Record<string, string> = {
  FRA: "FR",
  SEN: "SN",
  IRQ: "IQ",
  NOR: "NO",
  USA: "US",
  MEX: "MX",
  ENG: "GB-ENG",
  SCO: "GB-SCT",
  KOR: "KR",
  RSA: "ZA",
  GER: "DE",
  SUI: "CH",
  NED: "NL",
  CIV: "CI",
  CPV: "CV",
  KSA: "SA",
  NZL: "NZ",
  IRN: "IR",
  BIH: "BA",
  CUW: "CW",
  COD: "CD",
  UZB: "UZ",
  ALG: "DZ",
};

function wikiCodeToOurCode(wikiCode: string): string {
  return WIKI_FLAG_TO_OUR[wikiCode] ?? wikiCode;
}

function wikiTeamMatchesOurCode(
  wikiCode: string,
  ourCode: string | null,
): boolean {
  if (!wikiCode || !ourCode) return false;
  const mapped = wikiCodeToOurCode(wikiCode).toUpperCase();
  if (mapped === ourCode.toUpperCase()) return true;
  const tla = footballDataTlaForOurCode(ourCode);
  return Boolean(tla && wikiCode.toUpperCase() === tla);
}

function parseGoalLines(
  block: string,
  teamSide: "home" | "away",
  teamName: string,
): MatchGoalEvent[] {
  const events: MatchGoalEvent[] = [];
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("*"));

  for (const line of lines) {
    const content = line.replace(/^\*\s*/, "");
    const linkMatch = content.match(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]\s*(.*)$/);
    const displayName = linkMatch?.[2] ?? linkMatch?.[1] ?? content;
    const minutesPart = linkMatch?.[3] ?? "";
    const minuteTokens = minutesPart
      .split(",")
      .map((m) => m.trim().replace(/'/g, ""))
      .filter(Boolean);

    for (const token of minuteTokens) {
      const { name, type } = detectGoalType(displayName);
      const minute = parseGoalMinute(token);
      events.push({
        minute: minute.display,
        minuteSort: minute.sort,
        teamSide,
        teamName,
        scorerName: name,
        assistName: null,
        scoreAfter: null,
        type,
      });
    }
  }

  return events;
}

function parseFootballBoxes(wikitext: string): WikiFootballBox[] {
  const boxes = [...wikitext.matchAll(/\{\{#invoke:football box\|main([\s\S]*?)\n\}\}/g)];
  return boxes.map((box) => {
    const body = box[1];
    const dateMatch = body.match(/\|date=\{\{Start date\|(\d+)\|(\d+)\|(\d+)\}\}/);
    const team1 = body.match(/\|team1=\{\{#invoke:flag\|fb[^|]*\|([A-Z0-9]+)\}\}/);
    const team2 = body.match(/\|team2=\{\{#invoke:flag\|fb[^|]*\|([A-Z0-9]+)\}\}/);
    const goals1 = body.match(/\|goals1=\s*([\s\S]*?)(?=\|goals2=|\|stadium=)/)?.[1] ?? "";
    const goals2 = body.match(/\|goals2=\s*([\s\S]*?)(?=\|stadium=|\|report=)/)?.[1] ?? "";

    return {
      date: dateMatch
        ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`
        : "",
      team1Code: team1?.[1] ?? "",
      team2Code: team2?.[1] ?? "",
      goals1,
      goals2,
    };
  });
}

function ourCodeToWiki(code: string | null): string | null {
  if (!code) return null;
  return footballDataTlaForOurCode(code);
}

export async function fetchWikipediaGroupWikitext(
  groupLetter: string,
): Promise<string | null> {
  const page = `2026_FIFA_World_Cup_Group_${groupLetter.toUpperCase()}`;
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": GOAL_EVENTS_USER_AGENT },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      parse?: { wikitext?: { "*": string } };
    };
    return json.parse?.wikitext?.["*"] ?? null;
  } catch {
    return null;
  }
}

export function findWikipediaMatchGoals(
  wikitext: string,
  options: {
    homeCode: string | null;
    awayCode: string | null;
    homeName: string;
    awayName: string;
    kickoffDate: string;
  },
): MatchGoalEvent[] {
  const homeWiki = ourCodeToWiki(options.homeCode);
  const awayWiki = ourCodeToWiki(options.awayCode);
  const kickoffDay = options.kickoffDate.slice(0, 10);

  for (const box of parseFootballBoxes(wikitext)) {
    if (box.date && box.date !== kickoffDay) continue;

    const homeOnTeam1 = wikiTeamMatchesOurCode(box.team1Code, options.homeCode);
    const homeOnTeam2 = wikiTeamMatchesOurCode(box.team2Code, options.homeCode);

    if (!homeOnTeam1 && !homeOnTeam2) continue;

    const homeGoals = homeOnTeam1 ? box.goals1 : box.goals2;
    const awayGoals = homeOnTeam1 ? box.goals2 : box.goals1;

    const events = [
      ...parseGoalLines(homeGoals, "home", options.homeName),
      ...parseGoalLines(awayGoals, "away", options.awayName),
    ];

    if (events.length > 0) return sortGoalEvents(events);
  }

  if (!homeWiki || !awayWiki) return [];

  for (const box of parseFootballBoxes(wikitext)) {
    const pair = new Set([box.team1Code, box.team2Code]);
    if (!pair.has(homeWiki) || !pair.has(awayWiki)) continue;
    const homeIsTeam1 = box.team1Code === homeWiki;
    const events = [
      ...parseGoalLines(homeIsTeam1 ? box.goals1 : box.goals2, "home", options.homeName),
      ...parseGoalLines(homeIsTeam1 ? box.goals2 : box.goals1, "away", options.awayName),
    ];
    if (events.length > 0) return sortGoalEvents(events);
  }

  return [];
}
