import type { MatchResultSelection, MatchWithTeams } from "@/types/database";

/** Libellés pour le pari « résultat » — ordre d’affichage, pas domicile/extérieur (CDM neutre). */
export const MATCH_RESULT_COPY = {
  label: "Résultat du match",
  labelShort: "Résultat",
  tabQuick: "Résultat simple",
  oddsHeading: "Cotes du résultat",
  oddsHeadingCompact: "1 · N · 2",
  knockoutBetNote:
    "Pronostics sur le score à 90 minutes (temps réglementaire). Prolongations et tirs au but exclus — le nul reste possible.",
  pronosticSaved: "Pronostic enregistré",
  pronosticSavedResult: "Pronostic sur le résultat enregistré",
  yourPronostic: "Votre pronostic sur le résultat",
  pronosticLocked: "Pronostic sur le résultat verrouillé",
  validate: "Valider mon pronostic",
  update: "Enregistrer les modifications",
  modifyHint:
    "Vous pouvez modifier votre choix jusqu'au coup d'envoi.",
  pronosticUpdated: "Pronostic mis à jour",
  exactScoreUpdated: "Score exact mis à jour",
  alreadyOnMatch: "Vous avez déjà un pronostic sur le résultat pour ce match.",
  alreadyOnMatchClassic:
    "Vous avez déjà un pronostic sur ce match (résultat ou score exact, pas les deux).",
  kickoffClosed: "Coup d'envoi passé — plus de pari sur le résultat possible.",
  oneChoicePerMatch: "Un seul choix par match : résultat simple ou score exact.",
  boostHint:
    "Le boost double les gains sur un pari résultat simple ou score exact (tendance ou tout pile).",
  betsClosedLive: "Paris sur le résultat fermés — paris fun toujours possibles",
  pendingAdmin: (n: number) =>
    `${n} pari(s) en attente sur ce match (résultat). Saisissez`,
  equivalentOdd: "cote équivalente au résultat",
  sameAsResult: "même barème que le résultat",
  team1: "Équipe 1",
  team2: "Équipe 2",
} as const;

/** Abrégés 1 / N / 2 quand les noms d’équipes ne sont pas disponibles. */
export const MATCH_RESULT_OUTCOME = {
  home: "1",
  draw: "Nul",
  away: "2",
} as const;

export function teamSlotLabel(
  slot: "home" | "away",
  team?: { name: string; code?: string | null },
): string {
  const fallback = slot === "home" ? MATCH_RESULT_COPY.team1 : MATCH_RESULT_COPY.team2;
  if (!team) return fallback;
  return team.code?.trim() || team.name;
}

export function matchResultSelectionLabel(
  side: MatchResultSelection,
  homeTeam: string,
  awayTeam: string,
): string {
  if (side === "draw") return "Nul";
  if (side === "home") return homeTeam;
  return awayTeam;
}

export function matchResultSelectionLabelLong(
  side: MatchResultSelection,
  homeTeam: string,
  awayTeam: string,
): string {
  if (side === "draw") return "Match nul";
  if (side === "home") return `Victoire ${homeTeam}`;
  return `Victoire ${awayTeam}`;
}

export function buildMatchResultOutcomes(match: MatchWithTeams) {
  return [
    {
      key: "home" as const,
      label: teamSlotLabel("home", match.home_team),
      name: match.home_team.name,
      odd: match.odd_home,
    },
    {
      key: "draw" as const,
      label: MATCH_RESULT_OUTCOME.draw,
      name: "Match nul",
      odd: match.odd_draw,
    },
    {
      key: "away" as const,
      label: teamSlotLabel("away", match.away_team),
      name: match.away_team.name,
      odd: match.odd_away,
    },
  ].filter((o) => o.odd != null);
}

/** Champs formulaire admin : nom du champ → libellé affiché */
export const MATCH_RESULT_ODDS_FIELDS = [
  ["oddHome", MATCH_RESULT_COPY.team1],
  ["oddDraw", MATCH_RESULT_OUTCOME.draw],
  ["oddAway", MATCH_RESULT_COPY.team2],
] as const;

export function selectionLabel(selection: string): string {
  if (selection in MATCH_RESULT_OUTCOME) {
    return MATCH_RESULT_OUTCOME[selection as MatchResultSelection];
  }
  return selection;
}
