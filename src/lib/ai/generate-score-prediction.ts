import { generateMatchSummaryText } from "@/lib/ai/match-summary";

export interface ScorePredictionInput {
  homeTeam: string;
  awayTeam: string;
  oddHome: number | null;
  oddDraw: number | null;
  oddAway: number | null;
}

export interface ScorePrediction {
  home: number;
  away: number;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(20, Math.round(value)));
}

function parseScoreJson(text: string): ScorePrediction | null {
  const match = text.match(/\{[\s\S]*?"home"\s*:\s*(\d+)[\s\S]*?"away"\s*:\s*(\d+)[\s\S]*?\}/i);
  if (match) {
    return {
      home: clampScore(Number(match[1])),
      away: clampScore(Number(match[2])),
    };
  }

  const scoreMatch = text.match(/(\d+)\s*[-–:]\s*(\d+)/);
  if (scoreMatch) {
    return {
      home: clampScore(Number(scoreMatch[1])),
      away: clampScore(Number(scoreMatch[2])),
    };
  }

  return null;
}

/** Pronostic déterministe basé sur les cotes (sans LLM). */
export function heuristicScorePrediction(
  input: ScorePredictionInput,
): ScorePrediction {
  const candidates: { side: "home" | "draw" | "away"; odd: number }[] = [];
  if (input.oddHome != null && input.oddHome >= 1.01) {
    candidates.push({ side: "home", odd: input.oddHome });
  }
  if (input.oddDraw != null && input.oddDraw >= 1.01) {
    candidates.push({ side: "draw", odd: input.oddDraw });
  }
  if (input.oddAway != null && input.oddAway >= 1.01) {
    candidates.push({ side: "away", odd: input.oddAway });
  }

  if (candidates.length === 0) {
    return { home: 1, away: 1 };
  }

  candidates.sort((a, b) => a.odd - b.odd);
  const favorite = candidates[0]!.side;

  if (favorite === "home") return { home: 2, away: 1 };
  if (favorite === "away") return { home: 1, away: 2 };
  return { home: 1, away: 1 };
}

function buildScorePrompt(input: ScorePredictionInput): {
  system: string;
  user: string;
} {
  const oddsLine = [
    input.oddHome != null ? `domicile ${input.oddHome}` : null,
    input.oddDraw != null ? `nul ${input.oddDraw}` : null,
    input.oddAway != null ? `extérieur ${input.oddAway}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    system:
      "Tu es un pronostiqueur football. Réponds UNIQUEMENT avec un JSON valide de la forme {\"home\": N, \"away\": M} où N et M sont des entiers entre 0 et 5. Pas de texte autour.",
    user: `Match : ${input.homeTeam} vs ${input.awayTeam}\nCotes 1N2 : ${oddsLine || "non disponibles"}\nDonne un score exact réaliste.`,
  };
}

export async function generateScorePrediction(
  input: ScorePredictionInput,
): Promise<ScorePrediction> {
  const hasLlmKey =
    Boolean(process.env.GROQ_API_KEY?.trim()) ||
    Boolean(process.env.GEMINI_API_KEY?.trim());

  if (!hasLlmKey) {
    return heuristicScorePrediction(input);
  }

  const { system, user } = buildScorePrompt(input);

  try {
    const raw = await generateMatchSummaryText(system, user);
    const parsed = parseScoreJson(raw);
    if (parsed) return parsed;
  } catch {
    // Fallback silencieux sur l'heuristique
  }

  return heuristicScorePrediction(input);
}
