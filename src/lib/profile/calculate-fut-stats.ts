import { impliedMatchResult } from "@/lib/exact-score";
import type { BetRow, MatchResultSelection, MatchWithTeams } from "@/types/database";

export type FUTStatKey = "PRC" | "REG" | "AUD" | "SEC" | "NUL" | "END";

export interface FUTStat {
  key: FUTStatKey;
  /** Libellé court affiché sur la carte (3 lettres). */
  short: string;
  /** Nom complet de la stat. */
  label: string;
  /** Texte d'aide affiché au survol. */
  description: string;
  value: number;
}

export interface FUTCardStats {
  ovr: number;
  stats: FUTStat[];
}

const STAT_META: Record<
  FUTStatKey,
  { short: string; label: string; description: string }
> = {
  PRC: {
    short: "PRC",
    label: "Précision",
    description:
      "Qualité de vos pronos réglés : scores exacts (tout pile & tendance) et résultats 1N2 gagnants.",
  },
  REG: {
    short: "REG",
    label: "Régularité",
    description:
      "Constancy et séries : victoires consécutives et taux de réussite global sur vos paris classiques.",
  },
  AUD: {
    short: "AUD",
    label: "Audace",
    description:
      "Appétit pour les outsiders : fréquence des paris à cote élevée (≥ 2,4) et réussite sur ces coups risqués.",
  },
  SEC: {
    short: "SEC",
    label: "Sécurité",
    description:
      "Efficacité sur les favoris : performance lorsque vous misez sur des cotes basses (≤ 1,85).",
  },
  NUL: {
    short: "NUL",
    label: "Flair nuls",
    description:
      "Instinct pour le match nul : fréquence des paris nul et taux de réussite sur ces pronos.",
  },
  END: {
    short: "END",
    label: "Endurance",
    description:
      "Assiduité : part des matchs du tournoi sur lesquels vous avez au moins un pari classique.",
  },
};

const DEFAULT_STAT = 52;

function clampStat(value: number): number {
  return Math.max(1, Math.min(99, Math.round(value)));
}

function isClassicBet(bet: BetRow): boolean {
  return bet.bet_type === "match_result" || bet.bet_type === "exact_score";
}

function settledClassicBets(bets: BetRow[]): BetRow[] {
  return bets.filter(
    (b) =>
      isClassicBet(b) &&
      (b.status === "won" || b.status === "lost") &&
      b.match != null,
  );
}

function resolveSelection(
  bet: BetRow,
): MatchResultSelection | null {
  if (bet.bet_type === "match_result") {
    return bet.selection.selection ?? null;
  }
  if (
    bet.bet_type === "exact_score" &&
    bet.selection.home != null &&
    bet.selection.away != null
  ) {
    return impliedMatchResult(bet.selection.home, bet.selection.away);
  }
  return null;
}

function actualResult(match: NonNullable<BetRow["match"]>): MatchResultSelection | null {
  if (match.home_score == null || match.away_score == null) return null;
  return impliedMatchResult(match.home_score, match.away_score);
}

function computePRC(settled: BetRow[]): number {
  if (settled.length === 0) return DEFAULT_STAT;

  let score = 0;
  let weight = 0;

  for (const bet of settled) {
    const match = bet.match!;
    const actual = actualResult(match);
    if (!actual) continue;

    if (bet.bet_type === "exact_score") {
      weight += 2;
      if (bet.status === "won" && bet.score_precision === "exact") {
        score += 2;
      } else if (
        bet.status === "won" ||
        (bet.selection.home != null &&
          bet.selection.away != null &&
          impliedMatchResult(bet.selection.home, bet.selection.away) === actual)
      ) {
        score += 1.2;
      }
    } else {
      weight += 1;
      if (bet.status === "won") score += 1;
    }
  }

  if (weight === 0) return DEFAULT_STAT;
  return clampStat(40 + (score / weight) * 55);
}

function computeREG(settled: BetRow[]): number {
  if (settled.length === 0) return DEFAULT_STAT;

  const chronological = [...settled].sort(
    (a, b) =>
      new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime(),
  );

  let bestStreak = 0;
  let current = 0;

  for (const bet of chronological) {
    if (bet.status === "won") {
      current += 1;
      bestStreak = Math.max(bestStreak, current);
    } else {
      current = 0;
    }
  }

  const winRate =
    settled.filter((b) => b.status === "won").length / settled.length;

  return clampStat(35 + bestStreak * 12 + winRate * 35);
}

function computeAUD(classic: BetRow[]): number {
  const withOdd = classic.filter((b) => b.odd_at_placement >= 1.01);
  if (withOdd.length === 0) return DEFAULT_STAT;

  const bold = withOdd.filter((b) => b.odd_at_placement >= 2.4);
  const boldWins = bold.filter((b) => b.status === "won").length;

  const boldRate = bold.length / withOdd.length;
  const boldSuccess = bold.length > 0 ? boldWins / bold.length : 0;

  return clampStat(38 + boldRate * 40 + boldSuccess * 25);
}

function computeSEC(settled: BetRow[]): number {
  const favorites = settled.filter((b) => b.odd_at_placement > 0 && b.odd_at_placement <= 1.85);
  if (favorites.length === 0) return DEFAULT_STAT;

  const wins = favorites.filter((b) => b.status === "won").length;
  return clampStat(42 + (wins / favorites.length) * 52);
}

function computeNUL(bets: BetRow[]): number {
  const drawPicks = bets.filter((b) => {
    if (!isClassicBet(b) || b.status === "void" || b.status === "cancelled") {
      return false;
    }
    return resolveSelection(b) === "draw";
  });

  if (drawPicks.length === 0) return DEFAULT_STAT - 8;

  const settledDraws = drawPicks.filter(
    (b) => b.status === "won" || b.status === "lost",
  );
  if (settledDraws.length === 0) {
    return clampStat(48 + Math.min(drawPicks.length * 4, 20));
  }

  const wins = settledDraws.filter((b) => b.status === "won").length;
  const flair = drawPicks.length / Math.max(bets.filter(isClassicBet).length, 1);

  return clampStat(36 + (wins / settledDraws.length) * 45 + flair * 18);
}

function computeEND(
  bets: BetRow[],
  matches: Pick<MatchWithTeams, "id" | "status">[],
): number {
  const bettableMatches = matches.filter(
    (m) => m.status === "scheduled" || m.status === "live" || m.status === "finished",
  );
  if (bettableMatches.length === 0) return DEFAULT_STAT;

  const covered = new Set(
    bets.filter(isClassicBet).map((b) => b.match_id),
  );

  const rate = covered.size / bettableMatches.length;
  return clampStat(30 + rate * 68);
}

function computeOVR(values: number[]): number {
  if (values.length === 0) return DEFAULT_STAT;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return clampStat(avg);
}

function buildStat(key: FUTStatKey, value: number): FUTStat {
  const meta = STAT_META[key];
  return {
    key,
    short: meta.short,
    label: meta.label,
    description: meta.description,
    value: clampStat(value),
  };
}

/**
 * Transforme l'historique de paris en 6 stats FUT (1–99) + note générale OVR.
 */
export function calculateFUTStats(
  userBets: BetRow[],
  matches: Pick<MatchWithTeams, "id" | "status">[],
): FUTCardStats {
  const classic = userBets.filter(isClassicBet);
  const settled = settledClassicBets(userBets);

  const prc = computePRC(settled);
  const reg = computeREG(settled);
  const aud = computeAUD(classic);
  const sec = computeSEC(settled);
  const nul = computeNUL(classic);
  const end = computeEND(userBets, matches);

  const stats = [
    buildStat("PRC", prc),
    buildStat("REG", reg),
    buildStat("AUD", aud),
    buildStat("SEC", sec),
    buildStat("NUL", nul),
    buildStat("END", end),
  ];

  return {
    ovr: computeOVR(stats.map((s) => s.value)),
    stats,
  };
}
