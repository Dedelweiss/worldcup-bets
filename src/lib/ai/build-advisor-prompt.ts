export interface AdvisorMatchContext {
  homeTeam: string;
  awayTeam: string;
  oddHome: number | null;
  oddDraw: number | null;
  oddAway: number | null;
  stage: string;
  crowdHome: number;
  crowdDraw: number;
  crowdAway: number;
}

export interface AdvisorUserStats {
  totalBets: number;
  winRate: number;
  streakWins: number;
  drawSuccessRate: number | null;
}

function formatOdds(
  homeTeam: string,
  awayTeam: string,
  oddHome: number | null,
  oddDraw: number | null,
  oddAway: number | null,
): string {
  if (!oddHome && !oddDraw && !oddAway) return "non disponibles";
  const parts: string[] = [];
  if (oddHome) parts.push(`${homeTeam} @${oddHome.toFixed(2)}`);
  if (oddDraw) parts.push(`Nul @${oddDraw.toFixed(2)}`);
  if (oddAway) parts.push(`${awayTeam} @${oddAway.toFixed(2)}`);
  return parts.join(", ");
}

function impliedProbabilities(
  oddHome: number | null,
  oddDraw: number | null,
  oddAway: number | null,
): { home: number; draw: number; away: number } | null {
  const raw = {
    home: oddHome != null && oddHome >= 1.01 ? 1 / oddHome : 0,
    draw: oddDraw != null && oddDraw >= 1.01 ? 1 / oddDraw : 0,
    away: oddAway != null && oddAway >= 1.01 ? 1 / oddAway : 0,
  };
  const total = raw.home + raw.draw + raw.away;
  if (total <= 0) return null;
  return {
    home: Math.round((raw.home / total) * 100),
    draw: Math.round((raw.draw / total) * 100),
    away: Math.round((raw.away / total) * 100),
  };
}

export function buildAdvisorSystemPrompt(
  ctx: AdvisorMatchContext,
  userStats: AdvisorUserStats | null,
): string {
  const probs = impliedProbabilities(ctx.oddHome, ctx.oddDraw, ctx.oddAway);
  const oddsLine = formatOdds(
    ctx.homeTeam,
    ctx.awayTeam,
    ctx.oddHome,
    ctx.oddDraw,
    ctx.oddAway,
  );

  const probLine = probs
    ? `Probabilités implicites des cotes : ${ctx.homeTeam} ${probs.home}%, Nul ${probs.draw}%, ${ctx.awayTeam} ${probs.away}%`
    : "Probabilités : non calculables (cotes absentes)";

  const crowdLine = `Tendance de la foule (pronostics déjà placés) : ${ctx.homeTeam} ${ctx.crowdHome}%, Nul ${ctx.crowdDraw}%, ${ctx.awayTeam} ${ctx.crowdAway}%`;

  const userSection = userStats
    ? `Profil du parieur :
- Total de paris joués : ${userStats.totalBets}
- Taux de réussite global : ${Math.round(userStats.winRate * 100)}%
- Série de victoires en cours : ${userStats.streakWins}
- Taux de réussite sur les paris Nul : ${userStats.drawSuccessRate !== null ? `${Math.round(userStats.drawSuccessRate * 100)}%` : "données insuffisantes"}`
    : "Profil du parieur : pas encore de paris joués.";

  return `Tu es un conseiller paris football expert et bienveillant. Tu aides un joueur à décider son pari pour un match précis.

CONTEXTE DU MATCH :
Match : ${ctx.homeTeam} vs ${ctx.awayTeam} (${ctx.stage})
Cotes 1N2 : ${oddsLine}
${probLine}
${crowdLine}

${userSection}

RÈGLES :
- Réponds toujours en français, de façon concise (4 à 6 phrases max)
- Sois direct : donne une recommandation claire avec un argument principal
- Si les cotes suggèrent un favori évident, dis-le franchement
- Si le match est ouvert, propose une stratégie (valeur des cotes, tendance foule)
- Ne fais jamais de disclaimer légal ou de mise en garde excessive
- Adapte le conseil au profil du joueur si des données sont disponibles
- Tu peux suggérer un score exact si l'utilisateur hésite entre résultat et score exact`;
}

export function buildAdvisorSuggestions(
  homeTeam: string,
  awayTeam: string,
): string[] {
  return [
    `Qui devrait gagner ce match ?`,
    `Analyse les cotes ${homeTeam} vs ${awayTeam}`,
    `Quel score exact viser ?`,
  ];
}
