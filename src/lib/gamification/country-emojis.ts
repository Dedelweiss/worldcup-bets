import { COUNTRY_EMOJIS } from "@/lib/gamification/country-emojis-data";

export { COUNTRY_EMOJIS };

export const FOOTBALL_EMOJIS = ["⚽", "🏆", "🏟️", "🎉", "🥅", "👏"] as const;

/** Alias FIFA / historiques → clé du dictionnaire. */
const COUNTRY_ALIASES: Record<string, string> = {
  ARG: "AR",
  BRA: "BR",
  DEU: "DE",
  ENG: "GB-ENG",
  EN: "GB-ENG",
  FRA: "FR",
  GBR: "GB",
  ITA: "IT",
  JPN: "JP",
  KOR: "KR",
  MAR: "MA",
  MEX: "MX",
  NED: "NL",
  POR: "PT",
  SCO: "GB-SCT",
  SCT: "GB-SCT",
  SEN: "SN",
  SPA: "ES",
  UK: "GB",
  USA: "US",
  WAL: "GB-WLS",
  WLS: "GB-WLS",
};

function resolveCountryKey(code: string): string | null {
  const upper = code.trim().toUpperCase();
  if (!upper) return null;

  if (upper in COUNTRY_EMOJIS) return upper;

  const aliased = COUNTRY_ALIASES[upper];
  if (aliased && aliased in COUNTRY_EMOJIS) return aliased;

  return null;
}

export function normalizeCountryCode(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  return resolveCountryKey(code);
}

export function getEmojisForCountry(
  code: string | null | undefined,
): readonly string[] {
  const key = normalizeCountryCode(code);
  if (key) return COUNTRY_EMOJIS[key]!;
  return FOOTBALL_EMOJIS;
}
