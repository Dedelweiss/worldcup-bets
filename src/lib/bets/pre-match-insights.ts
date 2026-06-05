import { getUserBets } from "@/lib/bets";
import {
  generateScorePrediction,
  type ScorePrediction,
} from "@/lib/ai/generate-score-prediction";
import { impliedMatchResult } from "@/lib/exact-score";
import type { BetRow, MatchResultSelection, MatchWithTeams, Team } from "@/types/database";

export interface CrowdPickDistribution {
  home: number;
  draw: number;
  away: number;
  /** Nombre de pronostics agrégés (0 = estimation via cotes). */
  sampleSize: number;
  isEstimated: boolean;
}

export interface PreMatchInsights {
  crowd: CrowdPickDistribution;
  aiPrediction: ScorePrediction;
  aiLabel: string;
  personalInsight: string | null;
}

function normalizeDistribution(
  home: number,
  draw: number,
  away: number,
): Pick<CrowdPickDistribution, "home" | "draw" | "away"> {
  const total = home + draw + away;
  if (total <= 0) {
    return { home: 34, draw: 33, away: 33 };
  }
  return {
    home: Math.round((home / total) * 100),
    draw: Math.round((draw / total) * 100),
    away: Math.round((away / total) * 100),
  };
}

/** Répartition implicite dérivée des cotes bookmaker. */
export function estimateCrowdPicksFromOdds(
  match: MatchWithTeams,
): CrowdPickDistribution {
  const raw = {
    home: match.odd_home != null && match.odd_home >= 1.01 ? 1 / match.odd_home : 0,
    draw: match.odd_draw != null && match.odd_draw >= 1.01 ? 1 / match.odd_draw : 0,
    away: match.odd_away != null && match.odd_away >= 1.01 ? 1 / match.odd_away : 0,
  };

  const normalized = normalizeDistribution(raw.home, raw.draw, raw.away);

  return {
    ...normalized,
    sampleSize: 0,
    isEstimated: true,
  };
}

function formatAiLabel(
  prediction: ScorePrediction,
  homeTeam: Team,
  awayTeam: Team,
): string {
  const side = impliedMatchResult(prediction.home, prediction.away);
  if (side === "draw") {
    return `Match nul ${prediction.home}-${prediction.away}`;
  }
  const winner = side === "home" ? homeTeam.name : awayTeam.name;
  return `${prediction.home}-${prediction.away} pour ${winner}`;
}

function teamInvolved(match: NonNullable<BetRow["match"]>, teamId: number): boolean {
  return match.home_team.id === teamId || match.away_team.id === teamId;
}

function buildPersonalInsight(
  bets: BetRow[],
  match: MatchWithTeams,
): string | null {
  const settled = bets.filter(
    (b) =>
      (b.bet_type === "match_result" || b.bet_type === "exact_score") &&
      (b.status === "won" || b.status === "lost") &&
      b.match != null,
  );

  const insights: string[] = [];

  for (const team of [match.home_team, match.away_team]) {
    const related = settled.filter((b) => teamInvolved(b.match!, team.id));
    if (related.length < 3) continue;

    const wins = related.filter((b) => b.status === "won").length;
    const rate = Math.round((wins / related.length) * 100);

    if (rate <= 35) {
      insights.push(
        `Tu as un taux de réussite de ${rate}% sur les matchs de ${team.name}.`,
      );
    } else if (rate >= 70) {
      insights.push(
        `Tu cartonne sur ${team.name} avec ${rate}% de réussite (${related.length} matchs).`,
      );
    }
  }

  const drawPicks = settled.filter((b) => {
    if (b.bet_type === "match_result") return b.selection.selection === "draw";
    if (b.bet_type === "exact_score" && b.selection.home != null && b.selection.away != null) {
      return impliedMatchResult(b.selection.home, b.selection.away) === "draw";
    }
    return false;
  });

  if (drawPicks.length >= 4) {
    const drawWins = drawPicks.filter((b) => b.status === "won").length;
    const drawRate = Math.round((drawWins / drawPicks.length) * 100);
    if (drawRate <= 25) {
      insights.push(
        `Les nuls te résistent : seulement ${drawRate}% de réussite sur tes paris match nul.`,
      );
    }
  }

  return insights[0] ?? null;
}

export async function getPreMatchInsights(
  match: MatchWithTeams,
  userId: string,
): Promise<PreMatchInsights> {
  const userBets = await getUserBets(userId);
  const crowd = estimateCrowdPicksFromOdds(match);

  const aiPrediction = await generateScorePrediction({
    homeTeam: match.home_team.name,
    awayTeam: match.away_team.name,
    oddHome: match.odd_home,
    oddDraw: match.odd_draw,
    oddAway: match.odd_away,
  });

  return {
    crowd,
    aiPrediction,
    aiLabel: formatAiLabel(aiPrediction, match.home_team, match.away_team),
    personalInsight: buildPersonalInsight(userBets, match),
  };
}

/** Agrège des paris 1N2 bruts (tests ou RPC future). */
export function aggregateCrowdPicks(
  selections: MatchResultSelection[],
): CrowdPickDistribution {
  if (selections.length === 0) {
    return { home: 34, draw: 33, away: 33, sampleSize: 0, isEstimated: true };
  }

  let home = 0;
  let draw = 0;
  let away = 0;

  for (const pick of selections) {
    if (pick === "home") home += 1;
    else if (pick === "draw") draw += 1;
    else away += 1;
  }

  const normalized = normalizeDistribution(home, draw, away);

  return {
    ...normalized,
    sampleSize: selections.length,
    isEstimated: false,
  };
}
