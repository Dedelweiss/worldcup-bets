import { footballDataTlaForOurCode } from "@/lib/football-data/team-tla";

/**
 * Correspondance code football-data (TLA 3 lettres) -> ISO alpha-2 + nom français.
 * Sert à afficher le drapeau (libre de droits) et à regrouper l'album par nation.
 */
interface Nation {
  tla: string;
  iso2: string;
  name: string;
}

const NATIONS: Nation[] = [
  { tla: "FRA", iso2: "fr", name: "France" },
  { tla: "BRA", iso2: "br", name: "Brésil" },
  { tla: "ARG", iso2: "ar", name: "Argentine" },
  { tla: "ESP", iso2: "es", name: "Espagne" },
  { tla: "GER", iso2: "de", name: "Allemagne" },
  { tla: "POR", iso2: "pt", name: "Portugal" },
  { tla: "NED", iso2: "nl", name: "Pays-Bas" },
  { tla: "BEL", iso2: "be", name: "Belgique" },
  { tla: "ENG", iso2: "gb", name: "Angleterre" },
  { tla: "CRO", iso2: "hr", name: "Croatie" },
  { tla: "URU", iso2: "uy", name: "Uruguay" },
  { tla: "ITA", iso2: "it", name: "Italie" },
  { tla: "MEX", iso2: "mx", name: "Mexique" },
  { tla: "USA", iso2: "us", name: "États-Unis" },
  { tla: "JPN", iso2: "jp", name: "Japon" },
  { tla: "SEN", iso2: "sn", name: "Sénégal" },
  { tla: "MAR", iso2: "ma", name: "Maroc" },
  { tla: "SUI", iso2: "ch", name: "Suisse" },
  { tla: "DEN", iso2: "dk", name: "Danemark" },
  { tla: "CAN", iso2: "ca", name: "Canada" },
  { tla: "QAT", iso2: "qa", name: "Qatar" },
  { tla: "AUS", iso2: "au", name: "Australie" },
  { tla: "KOR", iso2: "kr", name: "Corée du Sud" },
  { tla: "POL", iso2: "pl", name: "Pologne" },
  { tla: "SRB", iso2: "rs", name: "Serbie" },
  { tla: "GHA", iso2: "gh", name: "Ghana" },
  { tla: "CMR", iso2: "cm", name: "Cameroun" },
  { tla: "ECU", iso2: "ec", name: "Équateur" },
  { tla: "IRN", iso2: "ir", name: "Iran" },
  { tla: "TUN", iso2: "tn", name: "Tunisie" },
  { tla: "KSA", iso2: "sa", name: "Arabie Saoudite" },
  { tla: "NGA", iso2: "ng", name: "Nigéria" },
  { tla: "EGY", iso2: "eg", name: "Égypte" },
  { tla: "COL", iso2: "co", name: "Colombie" },
  { tla: "PER", iso2: "pe", name: "Pérou" },
  { tla: "CHI", iso2: "cl", name: "Chili" },
  { tla: "PAR", iso2: "py", name: "Paraguay" },
  { tla: "ALG", iso2: "dz", name: "Algérie" },
  { tla: "CIV", iso2: "ci", name: "Côte d'Ivoire" },
  { tla: "RSA", iso2: "za", name: "Afrique du Sud" },
  { tla: "NOR", iso2: "no", name: "Norvège" },
  { tla: "SWE", iso2: "se", name: "Suède" },
  { tla: "AUT", iso2: "at", name: "Autriche" },
  { tla: "TUR", iso2: "tr", name: "Turquie" },
  { tla: "UKR", iso2: "ua", name: "Ukraine" },
  { tla: "SCO", iso2: "gb", name: "Écosse" },
  { tla: "WAL", iso2: "gb", name: "Pays de Galles" },
  { tla: "CRC", iso2: "cr", name: "Costa Rica" },
  { tla: "PAN", iso2: "pa", name: "Panama" },
  { tla: "JAM", iso2: "jm", name: "Jamaïque" },
  { tla: "NZL", iso2: "nz", name: "Nouvelle-Zélande" },
  { tla: "CZE", iso2: "cz", name: "Tchéquie" },
  { tla: "BIH", iso2: "ba", name: "Bosnie-Herzégovine" },
  { tla: "HAI", iso2: "ht", name: "Haïti" },
  { tla: "CUW", iso2: "cw", name: "Curaçao" },
  { tla: "CPV", iso2: "cv", name: "Cap-Vert" },
  { tla: "IRQ", iso2: "iq", name: "Irak" },
  { tla: "JOR", iso2: "jo", name: "Jordanie" },
  { tla: "COD", iso2: "cd", name: "RD Congo" },
  { tla: "UZB", iso2: "uz", name: "Ouzbékistan" },
];

const BY_TLA = new Map(NATIONS.map((n) => [n.tla.toUpperCase(), n]));
const BY_ISO2 = new Map(NATIONS.map((n) => [n.iso2, n]));

export function tlaToIso2(tla: string | null): string | null {
  if (!tla) return null;
  return BY_TLA.get(tla.toUpperCase())?.iso2 ?? null;
}

/**
 * Code équipe interne (seed WC2026 : FR, US, GB-ENG…) → ISO alpha-2 pour drapeau / maillot.
 */
export function ourTeamCodeToIso2(ourCode: string | null): string | null {
  if (!ourCode) return null;
  const key = ourCode.trim().toUpperCase();

  if (key === "GB-ENG" || key === "GB-SCT" || key === "GB-WAL") return "gb";

  if (key.length === 2) {
    const lower = key.toLowerCase();
    if (BY_ISO2.has(lower)) return lower;
  }

  const tla = footballDataTlaForOurCode(ourCode);
  if (tla) {
    const fromTla = tlaToIso2(tla);
    if (fromTla) return fromTla;
  }

  return tlaToIso2(key);
}

export function iso2ToName(iso2: string | null): string | null {
  if (!iso2) return null;
  return BY_ISO2.get(iso2)?.name ?? null;
}

/** Couleurs nationales (maillot stylisé) : primaire (corps) + secondaire (col/manches). */
export interface NationColors {
  primary: string;
  secondary: string;
}

const NATION_COLORS: Record<string, NationColors> = {
  fr: { primary: "#1e3a8a", secondary: "#ef4444" },
  br: { primary: "#facc15", secondary: "#16a34a" },
  ar: { primary: "#38bdf8", secondary: "#f8fafc" },
  es: { primary: "#dc2626", secondary: "#facc15" },
  de: { primary: "#1f2937", secondary: "#facc15" },
  pt: { primary: "#b91c1c", secondary: "#15803d" },
  nl: { primary: "#f97316", secondary: "#f8fafc" },
  be: { primary: "#ef4444", secondary: "#facc15" },
  gb: { primary: "#e5e7eb", secondary: "#dc2626" },
  hr: { primary: "#dc2626", secondary: "#f8fafc" },
  uy: { primary: "#38bdf8", secondary: "#f8fafc" },
  it: { primary: "#1d4ed8", secondary: "#f8fafc" },
  mx: { primary: "#15803d", secondary: "#dc2626" },
  us: { primary: "#1d4ed8", secondary: "#dc2626" },
  jp: { primary: "#1e3a8a", secondary: "#f8fafc" },
  sn: { primary: "#15803d", secondary: "#facc15" },
  ma: { primary: "#b91c1c", secondary: "#15803d" },
  ch: { primary: "#dc2626", secondary: "#f8fafc" },
  dk: { primary: "#dc2626", secondary: "#f8fafc" },
  ca: { primary: "#dc2626", secondary: "#f8fafc" },
  qa: { primary: "#7f1d1d", secondary: "#f8fafc" },
  au: { primary: "#facc15", secondary: "#16a34a" },
  kr: { primary: "#dc2626", secondary: "#1d4ed8" },
  pl: { primary: "#e5e7eb", secondary: "#dc2626" },
  rs: { primary: "#dc2626", secondary: "#1e3a8a" },
  gh: { primary: "#16a34a", secondary: "#facc15" },
  cm: { primary: "#16a34a", secondary: "#dc2626" },
  ec: { primary: "#facc15", secondary: "#1d4ed8" },
  ir: { primary: "#16a34a", secondary: "#dc2626" },
  tn: { primary: "#dc2626", secondary: "#f8fafc" },
  sa: { primary: "#15803d", secondary: "#f8fafc" },
  ng: { primary: "#16a34a", secondary: "#f8fafc" },
  eg: { primary: "#dc2626", secondary: "#111827" },
  co: { primary: "#facc15", secondary: "#1d4ed8" },
  pe: { primary: "#dc2626", secondary: "#f8fafc" },
  cl: { primary: "#dc2626", secondary: "#1d4ed8" },
  py: { primary: "#dc2626", secondary: "#1d4ed8" },
  dz: { primary: "#16a34a", secondary: "#f8fafc" },
  ci: { primary: "#f97316", secondary: "#16a34a" },
  za: { primary: "#15803d", secondary: "#facc15" },
  no: { primary: "#dc2626", secondary: "#1e3a8a" },
  se: { primary: "#facc15", secondary: "#1d4ed8" },
  at: { primary: "#dc2626", secondary: "#f8fafc" },
  tr: { primary: "#dc2626", secondary: "#f8fafc" },
  ua: { primary: "#facc15", secondary: "#1d4ed8" },
  pa: { primary: "#dc2626", secondary: "#1d4ed8" },
  jm: { primary: "#facc15", secondary: "#16a34a" },
  nz: { primary: "#1f2937", secondary: "#f8fafc" },
  cr: { primary: "#dc2626", secondary: "#1d4ed8" },
  cz: { primary: "#dc2626", secondary: "#1e3a8a" },
  ba: { primary: "#1d4ed8", secondary: "#facc15" },
  ht: { primary: "#1d4ed8", secondary: "#dc2626" },
  cw: { primary: "#1d4ed8", secondary: "#facc15" },
  cv: { primary: "#1d4ed8", secondary: "#dc2626" },
  iq: { primary: "#dc2626", secondary: "#111827" },
  jo: { primary: "#111827", secondary: "#dc2626" },
  cd: { primary: "#1d4ed8", secondary: "#facc15" },
  uz: { primary: "#1d4ed8", secondary: "#f8fafc" },
};

const NEUTRAL_COLORS: NationColors = {
  primary: "#475569",
  secondary: "#94a3b8",
};

export function getNationColors(iso2: string | null): NationColors {
  if (!iso2) return NEUTRAL_COLORS;
  return NATION_COLORS[iso2] ?? NEUTRAL_COLORS;
}
