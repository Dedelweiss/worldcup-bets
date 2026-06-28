/** Couleurs écuries pour l'UI (hex sans #). */
export const F1_TEAM_COLORS: Record<string, string> = {
  mercedes: "27F4D2",
  ferrari: "E8002D",
  "red bull": "3671C6",
  "red bull racing": "3671C6",
  mclaren: "FF8000",
  "aston martin": "229971",
  alpine: "0093CC",
  williams: "64C4FF",
  "rb f1 team": "6692FF",
  "racing bulls": "6692FF",
  sauber: "52E252",
  "kick sauber": "52E252",
  haas: "B6BABD",
  "haas f1 team": "B6BABD",
  cadillac: "004687",
};

export function teamColorHex(name: string | null | undefined): string {
  if (!name) return "71717a";
  const key = name.toLowerCase();
  return F1_TEAM_COLORS[key] ?? "71717a";
}
