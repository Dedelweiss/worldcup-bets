import type { MatchStage } from "@/types/database";

export const TOURNAMENT_GROUP_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

export const KNOCKOUT_STAGES: MatchStage[] = [
  "r32",
  "r16",
  "qf",
  "sf",
  "third_place",
  "final",
];

export const STAGE_LABELS: Record<MatchStage, string> = {
  group: "Phase de groupes",
  r32: "32es de finale",
  r16: "16es de finale",
  qf: "Quarts de finale",
  sf: "Demi-finales",
  third_place: "Match pour la 3e place",
  final: "Finale",
};

export const DEFAULT_KNOCKOUT_BET_NOTE =
  "Paris sur le résultat à la fin du temps réglementaire uniquement (prolongations et tirs au but exclus).";
