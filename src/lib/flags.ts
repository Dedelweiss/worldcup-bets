/** Drapeaux via flagcdn (code ISO 3166-1 alpha-2, ex. FR, BR) */
export function getFlagUrl(
  countryCode: string | null | undefined,
  width = 80,
): string | null {
  if (!countryCode?.trim()) return null;
  const code = countryCode.trim().toLowerCase();
  return `https://flagcdn.com/w${width}/${code}.png`;
}

export function teamLogoUrl(team: {
  logo_url: string | null;
  code: string | null;
}): string | null {
  return team.logo_url ?? getFlagUrl(team.code, 80);
}
