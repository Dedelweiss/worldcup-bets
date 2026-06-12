/** Couleurs emblématiques (drapeau / maillot) pour les disques hero. */
export interface TeamColorPalette {
  from: string;
  via?: string;
  to: string;
}

const CODE_ALIASES: Record<string, string> = {
  USA: "US",
  MEX: "MX",
  CAN: "CA",
  BRA: "BR",
  FRA: "FR",
  GER: "DE",
  DEU: "DE",
  ESP: "ES",
  ITA: "IT",
  ENG: "GB",
  GBR: "GB",
  POR: "PT",
  NED: "NL",
  BEL: "BE",
  CRO: "HR",
  SUI: "CH",
  CHE: "CH",
  AUT: "AT",
  POL: "PL",
  SWE: "SE",
  NOR: "NO",
  DEN: "DK",
  FIN: "FI",
  JPN: "JP",
  KOR: "KR",
  RSA: "ZA",
  ZAF: "ZA",
  MAR: "MA",
  SEN: "SN",
  CIV: "CI",
  GHA: "GH",
  CMR: "CM",
  EGY: "EG",
  TUN: "TN",
  ALG: "DZ",
  NGA: "NG",
  ARG: "AR",
  URU: "UY",
  COL: "CO",
  CHI: "CL",
  CHL: "CL",
  ECU: "EC",
  PER: "PE",
  PAR: "PY",
  PRY: "PY",
  CRC: "CR",
  PAN: "PA",
  MEXICO: "MX",
  QAT: "QA",
  KSA: "SA",
  SAU: "SA",
  IRN: "IR",
  IRQ: "IQ",
  AUS: "AU",
  NZL: "NZ",
  CZE: "CZ",
  CZECH: "CZ",
  TUR: "TR",
  TURKEY: "TR",
  UKR: "UA",
  SRB: "RS",
  WAL: "GB",
  SCO: "GB",
};

/** ISO alpha-2 → palette (couleurs dominantes du drapeau). */
const TEAM_COLORS: Record<string, TeamColorPalette> = {
  FR: { from: "#002395", via: "#ffffff", to: "#ed2939" },
  BR: { from: "#009c3b", via: "#ffdf00", to: "#002776" },
  AR: { from: "#74acdf", via: "#ffffff", to: "#74acdf" },
  DE: { from: "#000000", via: "#dd0000", to: "#ffce00" },
  ES: { from: "#c60b1e", via: "#ffc400", to: "#c60b1e" },
  IT: { from: "#009246", via: "#ffffff", to: "#ce2b37" },
  GB: { from: "#012169", via: "#ffffff", to: "#c8102e" },
  PT: { from: "#006600", via: "#ff0000", to: "#ffcc00" },
  NL: { from: "#ae1c28", via: "#ffffff", to: "#21468b" },
  BE: { from: "#000000", via: "#fdda24", to: "#ef3340" },
  US: { from: "#3c3b6e", via: "#b22234", to: "#ffffff" },
  MX: { from: "#006847", via: "#ffffff", to: "#ce1126" },
  CA: { from: "#ff0000", via: "#ffffff", to: "#ff0000" },
  JP: { from: "#ffffff", via: "#bc002d", to: "#bc002d" },
  KR: { from: "#ffffff", via: "#003478", to: "#cd2e3a" },
  AU: { from: "#00008b", via: "#ffffff", to: "#e4002b" },
  HR: { from: "#ff0000", via: "#ffffff", to: "#171796" },
  CH: { from: "#ff0000", via: "#ffffff", to: "#ff0000" },
  AT: { from: "#ed2939", via: "#ffffff", to: "#ed2939" },
  SE: { from: "#006aa7", via: "#fecc00", to: "#006aa7" },
  NO: { from: "#ba0c2f", via: "#ffffff", to: "#00205b" },
  DK: { from: "#c60c30", via: "#ffffff", to: "#c60c30" },
  PL: { from: "#ffffff", via: "#dc143c", to: "#dc143c" },
  CZ: { from: "#11457e", via: "#ffffff", to: "#d7141a" },
  TR: { from: "#e30a17", via: "#ffffff", to: "#e30a17" },
  MA: { from: "#c1272d", via: "#006233", to: "#c1272d" },
  SN: { from: "#00853f", via: "#fdef42", to: "#e31b23" },
  CI: { from: "#f77f00", via: "#ffffff", to: "#009e60" },
  GH: { from: "#ef3340", via: "#fcd116", to: "#006b3f" },
  EG: { from: "#ce1126", via: "#ffffff", to: "#000000" },
  TN: { from: "#e70013", via: "#ffffff", to: "#e70013" },
  DZ: { from: "#006233", via: "#ffffff", to: "#d21034" },
  ZA: { from: "#007749", via: "#ffb81c", to: "#001489" },
  NG: { from: "#008751", via: "#ffffff", to: "#008751" },
  UY: { from: "#ffffff", via: "#0038a8", to: "#ffffff" },
  CO: { from: "#fcd116", via: "#003893", to: "#ce1126" },
  CL: { from: "#0039a6", via: "#ffffff", to: "#d52b1e" },
  EC: { from: "#ffd100", via: "#034ea2", to: "#e8112d" },
  PE: { from: "#d91023", via: "#ffffff", to: "#d91023" },
  PY: { from: "#d52b1e", via: "#ffffff", to: "#0038a8" },
  CR: { from: "#002b7f", via: "#ffffff", to: "#ce1126" },
  PA: { from: "#ffffff", via: "#005293", to: "#d21034" },
  QA: { from: "#8d1b3d", via: "#ffffff", to: "#8d1b3d" },
  SA: { from: "#006c35", via: "#ffffff", to: "#006c35" },
  IR: { from: "#239f40", via: "#ffffff", to: "#da0000" },
  IQ: { from: "#ce1126", via: "#ffffff", to: "#000000" },
  NZ: { from: "#00247d", via: "#ffffff", to: "#cc142b" },
  BA: { from: "#002395", via: "#fecb00", to: "#002395" },
  HT: { from: "#00209f", via: "#d21034", to: "#00209f" },
  CV: { from: "#003893", via: "#ffffff", to: "#cf2027" },
  CD: { from: "#007fff", via: "#f7d618", to: "#ce1021" },
  UZ: { from: "#1eb53a", via: "#ffffff", to: "#0099b5" },
  JO: { from: "#000000", via: "#ffffff", to: "#007a3d" },
  CW: { from: "#002b7f", via: "#fae100", to: "#002b7f" },
};

function normalizeCountryCode(code: string | null | undefined): string | null {
  if (!code?.trim()) return null;
  const raw = code.trim().toUpperCase();
  if (CODE_ALIASES[raw]) return CODE_ALIASES[raw];
  if (raw.length === 2) return raw;
  if (raw.length === 3 && TEAM_COLORS[raw.slice(0, 2)]) return raw.slice(0, 2);
  return raw.length >= 2 ? raw.slice(0, 2) : raw;
}

function hashPalette(code: string): TeamColorPalette {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    from: `hsl(${hue} 45% 38%)`,
    via: `hsl(${(hue + 35) % 360} 40% 30%)`,
    to: `hsl(${(hue + 70) % 360} 50% 24%)`,
  };
}

export function getTeamColors(code: string | null | undefined): TeamColorPalette {
  const normalized = normalizeCountryCode(code);
  if (!normalized) {
    return { from: "#3f3f46", via: "#27272a", to: "#18181b" };
  }
  return TEAM_COLORS[normalized] ?? hashPalette(normalized);
}

export function teamColorGradientStyle(palette: TeamColorPalette): string {
  const mid = palette.via ?? palette.to;
  return `linear-gradient(145deg, ${palette.from} 0%, ${mid} 52%, ${palette.to} 100%)`;
}

export { normalizeCountryCode };
