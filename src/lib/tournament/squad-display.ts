import type { TeamSquadPlayer } from "@/types/database";

export type SquadPositionGroup = "gk" | "def" | "mid" | "fwd" | "other";

const GROUP_LABELS: Record<SquadPositionGroup, string> = {
  gk: "Gardiens",
  def: "Défenseurs",
  mid: "Milieux",
  fwd: "Attaquants",
  other: "Autres",
};

const GROUP_ORDER: SquadPositionGroup[] = ["gk", "def", "mid", "fwd", "other"];

export function squadPositionGroup(position: string | null): SquadPositionGroup {
  const p = position?.toLowerCase() ?? "";
  if (p.includes("goal")) return "gk";
  if (p.includes("defen") || p.includes("defence") || p.includes("defense")) return "def";
  if (p.includes("mid")) return "mid";
  if (p.includes("offen") || p.includes("forward") || p.includes("attack") || p.includes("striker")) {
    return "fwd";
  }
  return "other";
}

export function squadPositionLabel(position: string | null): string {
  const group = squadPositionGroup(position);
  if (group === "gk") return "Gardien";
  if (group === "def") return "Défenseur";
  if (group === "mid") return "Milieu";
  if (group === "fwd") return "Attaquant";
  return position ?? "Joueur";
}

export function groupSquadPlayers(
  players: TeamSquadPlayer[],
): { group: SquadPositionGroup; label: string; players: TeamSquadPlayer[] }[] {
  const buckets = new Map<SquadPositionGroup, TeamSquadPlayer[]>();
  for (const group of GROUP_ORDER) buckets.set(group, []);

  for (const player of players) {
    const group = squadPositionGroup(player.position);
    buckets.get(group)!.push(player);
  }

  return GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    players: buckets.get(group) ?? [],
  })).filter((entry) => entry.players.length > 0);
}

export function playerAgeAt(dateOfBirth: string | null, reference = "2026-06-11"): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const ref = new Date(reference);
  if (Number.isNaN(birth.getTime())) return null;
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export interface SquadPositionStyle {
  badgeClass: string;
  iconClass: string;
}

const POSITION_STYLES: Record<SquadPositionGroup, SquadPositionStyle> = {
  gk: {
    badgeClass: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
    iconClass: "text-amber-400",
  },
  def: {
    badgeClass: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
    iconClass: "text-sky-400",
  },
  mid: {
    badgeClass: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
    iconClass: "text-emerald-400",
  },
  fwd: {
    badgeClass: "bg-rose-500/15 text-rose-400 ring-rose-500/25",
    iconClass: "text-rose-400",
  },
  other: {
    badgeClass: "bg-white/10 text-muted-foreground ring-white/10",
    iconClass: "text-muted-foreground",
  },
};

export function squadPositionStyle(position: string | null): SquadPositionStyle {
  return POSITION_STYLES[squadPositionGroup(position)];
}

function normalizeCountryToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Synonymes nationalité (API football-data, souvent en anglais) ↔ équipe affichée (souvent en français).
 * Clé = code interne seed (MX, FR, GB-ENG…).
 */
const NATIONALITY_EQUIVALENTS_BY_TEAM_CODE: Record<string, string[]> = {
  MX: ["mexico", "mexique", "mex"],
  ZA: ["southafrica", "afriquedusud", "rsa"],
  KR: ["korea", "korearepublic", "southkorea", "coreedusud", "kor"],
  CZ: ["czech", "czechia", "czechrepublic", "tchequie", "cze"],
  CA: ["canada", "can"],
  BA: ["bosnia", "bosniaandherzegovina", "bosnieherzegovine", "bih"],
  QA: ["qatar", "qat"],
  CH: ["switzerland", "suisse", "sui"],
  BR: ["brazil", "bresil", "bra"],
  MA: ["morocco", "maroc", "mar"],
  HT: ["haiti", "hai"],
  "GB-SCT": ["scotland", "ecosse", "sco"],
  US: ["unitedstates", "usa", "america", "etatsunis"],
  PY: ["paraguay", "par"],
  AU: ["australia", "australie", "aus"],
  TR: ["turkey", "turkiye", "turquie", "tur"],
  DE: ["germany", "allemagne", "ger"],
  CW: ["curacao", "cuw"],
  CI: ["ivorycoast", "cotedivoire", "coteivoire", "civ"],
  EC: ["ecuador", "equateur", "ecu"],
  NL: ["netherlands", "holland", "paysbas", "ned"],
  JP: ["japan", "japon", "jpn"],
  SE: ["sweden", "suede", "swe"],
  TN: ["tunisia", "tunisie", "tun"],
  BE: ["belgium", "belgique", "bel"],
  EG: ["egypt", "egypte", "egy"],
  IR: ["iran", "irn"],
  NZ: ["newzealand", "nouvellezelande", "nzl"],
  ES: ["spain", "espagne", "esp"],
  CV: ["capeverde", "capvert", "cpv"],
  SA: ["saudiarabia", "arabiesaoudite", "ksa"],
  UY: ["uruguay", "uru"],
  FR: ["france", "fra"],
  SN: ["senegal", "sen"],
  NO: ["norway", "norvege", "nor"],
  IQ: ["iraq", "irak", "irq"],
  AR: ["argentina", "argentine", "arg"],
  DZ: ["algeria", "algerie", "alg"],
  AT: ["austria", "autriche", "aut"],
  JO: ["jordan", "jordanie", "jor"],
  PT: ["portugal", "por"],
  CD: ["congo", "drcongo", "democraticrepublicofthecongo", "rdcongo", "cod"],
  UZ: ["uzbekistan", "ouzbekistan", "uzb"],
  CO: ["colombia", "colombie", "col"],
  "GB-ENG": ["england", "angleterre", "eng"],
  HR: ["croatia", "croatie", "cro"],
  GH: ["ghana", "gha"],
  PA: ["panama", "pan"],
};

function nationalityMatchesTeam(
  nationality: string,
  teamName: string,
  teamCode: string | null,
): boolean {
  const n = normalizeCountryToken(nationality);
  if (!n) return false;

  const candidates = new Set<string>();
  candidates.add(normalizeCountryToken(teamName));

  if (teamCode) {
    const key = teamCode.trim().toUpperCase();
    for (const token of NATIONALITY_EQUIVALENTS_BY_TEAM_CODE[key] ?? []) {
      candidates.add(token);
    }
    candidates.add(normalizeCountryToken(key));
    candidates.add(normalizeCountryToken(key.replace("GB-", "")));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (n === candidate) return true;
    if (candidate.length >= 4 && (n.includes(candidate) || candidate.includes(n))) {
      return true;
    }
  }

  return false;
}

/** Masque la nationalité quand elle correspond déjà à la sélection. */
export function shouldShowPlayerNationality(
  nationality: string | null,
  teamName: string,
  teamCode: string | null,
): boolean {
  if (!nationality?.trim()) return false;
  return !nationalityMatchesTeam(nationality, teamName, teamCode);
}
