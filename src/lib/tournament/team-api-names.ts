/** Noms normalisés possibles côté APIs (odds-api, etc.) par code seed ISO. */
export const TEAM_CODE_API_KEYWORDS: Record<string, string[]> = {
  MX: ["mexico", "mexique"],
  ZA: ["southafrica", "afriquedusud", "rsa"],
  KR: ["korea", "southkorea", "coreedusud", "corée"],
  CZ: ["czech", "czechia", "czechrepublic", "tchequie", "tchéquie"],
  CA: ["canada"],
  BA: ["bosnia", "bosniaherzegovina", "bosnie"],
  QA: ["qatar"],
  CH: ["switzerland", "suisse"],
  BR: ["brazil", "brasil", "bresil", "brésil"],
  MA: ["morocco", "maroc"],
  HT: ["haiti", "haïti"],
  "GB-SCT": ["scotland", "ecosse", "écosse"],
  US: ["usa", "unitedstates", "etatsunis", "étatsunis"],
  PY: ["paraguay"],
  AU: ["australia", "australie"],
  TR: ["turkey", "turkiye", "turquie"],
  DE: ["germany", "allemagne"],
  CW: ["curacao", "curaçao"],
  CI: ["ivorycoast", "cotedivoire", "côtedivoire"],
  EC: ["ecuador", "equateur", "équateur"],
  NL: ["netherlands", "holland", "paysbas", "pays-bas"],
  JP: ["japan", "japon"],
  SE: ["sweden", "suede", "suède"],
  TN: ["tunisia", "tunisie"],
  BE: ["belgium", "belgique"],
  EG: ["egypt", "egypte", "égypte"],
  IR: ["iran"],
  NZ: ["newzealand", "nouvellezelande", "nouvelle-zélande"],
  ES: ["spain", "espagne"],
  CV: ["capeverde", "capvert", "cap-vert"],
  SA: ["saudiarabia", "arabiesaoudite", "arabie saoudite"],
  UY: ["uruguay"],
  FR: ["france"],
  SN: ["senegal", "sénégal"],
  NO: ["norway", "norvege", "norvège"],
  IQ: ["iraq", "irak"],
  AR: ["argentina", "argentine"],
  DZ: ["algeria", "algerie", "algérie"],
  AT: ["austria", "autriche"],
  JO: ["jordan", "jordanie"],
  PT: ["portugal"],
  CD: ["congo", "drcongo", "rdcongo", "democraticrepublic"],
  UZ: ["uzbekistan", "ouzbekistan", "ouzbékistan"],
  CO: ["colombia", "colombie"],
  "GB-ENG": ["england", "angleterre"],
  HR: ["croatia", "croatie"],
  GH: ["ghana"],
  PA: ["panama"],
};

export function normalizeTeamLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function apiTeamNameMatchesCode(
  apiName: string,
  code: string | null | undefined,
): boolean {
  if (!code) return false;
  const key = code.trim().toUpperCase();
  const keywords = TEAM_CODE_API_KEYWORDS[key];
  if (!keywords?.length) return false;
  const norm = normalizeTeamLabel(apiName);
  return keywords.some(
    (kw) => norm === kw || norm.includes(kw) || kw.includes(norm),
  );
}

export function teamNamesMatchForOdds(
  apiName: string,
  dbName: string,
  teamCode?: string | null,
): boolean {
  const a = normalizeTeamLabel(apiName);
  const b = normalizeTeamLabel(dbName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (teamCode && apiTeamNameMatchesCode(apiName, teamCode)) return true;
  if (a.length >= 4 && b.length >= 4) {
    return a.includes(b) || b.includes(a);
  }
  return false;
}
