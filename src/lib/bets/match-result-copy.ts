import type { MatchResultSelection, MatchWithTeams } from "@/types/database";

/** Libellés accessibles pour le pari « résultat du match » (domicile / nul / extérieur). */
export const MATCH_RESULT_COPY = {
  label: "Résultat du match",
  labelShort: "Résultat",
  tabQuick: "Résultat simple",
  oddsHeading: "Cotes du résultat",
  oddsHeadingCompact: "Dom. · Nul · Ext.",
  knockoutBetNote:
    "Paris sur le résultat à la fin du temps réglementaire uniquement (prolongations et tirs au but exclus).",
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
} as const;

export const MATCH_RESULT_OUTCOME = {
  home: "Domicile",
  draw: "Nul",
  away: "Extérieur",
} as const;

export function buildMatchResultOutcomes(match: MatchWithTeams) {
  return [
    {
      key: "home" as const,
      label: MATCH_RESULT_OUTCOME.home,
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
      label: MATCH_RESULT_OUTCOME.away,
      name: match.away_team.name,
      odd: match.odd_away,
    },
  ].filter((o) => o.odd != null);
}

/** Champs formulaire admin : nom du champ → libellé affiché */
export const MATCH_RESULT_ODDS_FIELDS = [
  ["oddHome", MATCH_RESULT_OUTCOME.home],
  ["oddDraw", MATCH_RESULT_OUTCOME.draw],
  ["oddAway", MATCH_RESULT_OUTCOME.away],
] as const;

export function selectionLabel(selection: string): string {
  if (selection in MATCH_RESULT_OUTCOME) {
    return MATCH_RESULT_OUTCOME[selection as MatchResultSelection];
  }
  return selection;
}
