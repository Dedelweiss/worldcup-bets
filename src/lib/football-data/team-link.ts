import { footballDataTlaForOurCode } from "@/lib/football-data/team-tla";
import type { FootballDataTeamRef } from "@/lib/football-data/types";

/** Variantes TLA renvoyées par l’API pour une même équipe. */
const EXPECTED_TLA_ALIASES: Record<string, string[]> = {
  JPN: ["JPN", "JAP"],
  SWE: ["SWE", "SW"],
  KOR: ["KOR", "KOR"],
  USA: ["USA", "US"],
};

/** Mots-clés (nom API normalisé) par code seed — évite les confusions (ex. Japon / Suède). */
const OUR_CODE_NAME_KEYWORDS: Record<string, string[]> = {
  JP: ["japon", "japan"],
  SE: ["suede", "suède", "sweden", "sverige"],
  NL: ["netherlands", "paysbas", "holland", "nederland"],
  TN: ["tunisia", "tunisie"],
  MX: ["mexico", "mexique"],
  US: ["unitedstates", "usa", "etatsunis"],
  "GB-ENG": ["england", "angleterre"],
};

export function normalizeTeamLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function nameKeywordsForOurCode(code: string | null | undefined): string[] {
  if (!code) return [];
  const key = code.trim().toUpperCase();
  return OUR_CODE_NAME_KEYWORDS[key] ?? [];
}

export function apiTlaMatchesOurCode(
  apiTla: string | null | undefined,
  ourCode: string | null | undefined,
): boolean {
  const expected = footballDataTlaForOurCode(ourCode);
  if (!expected) return false;
  const normApi = (apiTla ?? "").trim().toUpperCase();
  if (!normApi) return false;
  const normExpected = expected.trim().toUpperCase();
  if (normApi === normExpected) return true;
  const aliases = EXPECTED_TLA_ALIASES[normExpected] ?? [normExpected];
  return aliases.includes(normApi);
}

export function footballDataSideMatchesOurCode(
  side: FootballDataTeamRef,
  ourCode: string | null | undefined,
): boolean {
  if (!ourCode) return false;

  const keywords = nameKeywordsForOurCode(ourCode);
  const normalizedName = normalizeTeamLabel(
    side.shortName ?? side.name ?? "",
  );
  const nameMatch =
    keywords.length > 0 &&
    keywords.some(
      (kw) =>
        normalizedName.includes(kw) ||
        kw.includes(normalizedName) ||
        normalizedName === kw,
    );

  const tlaMatch = apiTlaMatchesOurCode(side.tla, ourCode);

  if (nameMatch && tlaMatch) return true;
  if (nameMatch && !(side.tla ?? "").trim()) return true;
  if (tlaMatch && keywords.length === 0) return true;
  if (nameMatch && !tlaMatch && (side.tla ?? "").trim()) return false;
  if (nameMatch) return true;
  return tlaMatch;
}

/** ID football-data pour un code seed, déduit de la liste des matchs API. */
export function resolveFootballDataTeamId(
  ourCode: string | null | undefined,
  sides: FootballDataTeamRef[],
): number | null {
  if (!ourCode) return null;

  let found: number | null = null;
  for (const side of sides) {
    if (!side.id) continue;
    if (!footballDataSideMatchesOurCode(side, ourCode)) continue;
    if (found != null && found !== side.id) return null;
    found = side.id;
  }
  return found;
}

export function collectSidesFromMatches(
  fdList: { homeTeam: FootballDataTeamRef; awayTeam: FootballDataTeamRef }[],
): FootballDataTeamRef[] {
  const byId = new Map<number, FootballDataTeamRef>();
  for (const fd of fdList) {
    for (const side of [fd.homeTeam, fd.awayTeam]) {
      if (side.id) byId.set(side.id, side);
    }
  }
  return [...byId.values()];
}
