import { isAiConfigured } from "@/lib/ai/constants";
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

function clampScore(value: ScorePrediction): ScorePrediction {
  return {
    home: Math.max(0, Math.min(20, Math.round(value.home))),
    away: Math.max(0, Math.min(20, Math.round(value.away))),
  };
}

function parseScoreJson(text: string): ScorePrediction | null {
  const match = text.match(/\{[\s\S]*?"home"\s*:\s*(\d+)[\s\S]*?"away"\s*:\s*(\d+)[\s\S]*?\}/i);
  if (match) {
    return clampScore({
      home: Number(match[1]),
      away: Number(match[2]),
    });
  }

  const scoreMatch = text.match(/(\d+)\s*[-–:]\s*(\d+)/);
  if (scoreMatch) {
    return clampScore({
      home: Number(scoreMatch[1]),
      away: Number(scoreMatch[2]),
    });
  }

  return null;
}

function hashSeed(input: ScorePredictionInput): number {
  const key = [
    input.homeTeam.trim().toLowerCase(),
    input.awayTeam.trim().toLowerCase(),
    input.oddHome?.toFixed(2) ?? "",
    input.oddDraw?.toFixed(2) ?? "",
    input.oddAway?.toFixed(2) ?? "",
  ].join("|");

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickFromPool(pool: ScorePrediction[], seed: number): ScorePrediction {
  return clampScore(pool[seed % pool.length] ?? pool[0]!);
}

function impliedProbabilities(
  input: ScorePredictionInput,
): { home: number; draw: number; away: number } | null {
  const raw = {
    home:
      input.oddHome != null && input.oddHome >= 1.01 ? 1 / input.oddHome : 0,
    draw:
      input.oddDraw != null && input.oddDraw >= 1.01 ? 1 / input.oddDraw : 0,
    away:
      input.oddAway != null && input.oddAway >= 1.01 ? 1 / input.oddAway : 0,
  };

  const total = raw.home + raw.draw + raw.away;
  if (total <= 0) return null;

  return {
    home: raw.home / total,
    draw: raw.draw / total,
    away: raw.away / total,
  };
}

/** Pronostic déterministe basé sur les cotes (sans LLM). */
export function heuristicScorePrediction(
  input: ScorePredictionInput,
): ScorePrediction {
  const probs = impliedProbabilities(input);
  const seed = hashSeed(input);

  if (!probs) {
    return { home: 1, away: 1 };
  }

  const { home: pHome, draw: pDraw, away: pAway } = probs;
  const favorite =
    pHome >= pDraw && pHome >= pAway
      ? "home"
      : pAway >= pDraw
        ? "away"
        : "draw";
  const maxP = Math.max(pHome, pDraw, pAway);
  const minP = Math.min(pHome, pDraw, pAway);
  const tightMatch = maxP - minP < 0.12;

  if (favorite === "draw" || (pDraw >= 0.26 && tightMatch)) {
    return pickFromPool(
      [
        { home: 0, away: 0 },
        { home: 1, away: 1 },
        { home: 2, away: 2 },
        { home: 1, away: 1 },
      ],
      seed,
    );
  }

  if (favorite === "home") {
    const strong =
      pHome >= 0.52 ||
      (input.oddHome != null && input.oddHome <= 1.65);
    const moderate =
      pHome >= 0.38 ||
      (input.oddHome != null && input.oddHome <= 2.4);

    if (strong) {
      return pickFromPool(
        [
          { home: 2, away: 0 },
          { home: 3, away: 1 },
          { home: 3, away: 0 },
          { home: 2, away: 1 },
          { home: 1, away: 0 },
        ],
        seed,
      );
    }

    if (moderate) {
      return pickFromPool(
        [
          { home: 2, away: 1 },
          { home: 1, away: 0 },
          { home: 2, away: 0 },
          { home: 3, away: 2 },
          { home: 1, away: 0 },
        ],
        seed,
      );
    }

    return pickFromPool(
      [
        { home: 1, away: 0 },
        { home: 2, away: 1 },
        { home: 1, away: 0 },
        { home: 2, away: 0 },
      ],
      seed,
    );
  }

  const strong =
    pAway >= 0.52 || (input.oddAway != null && input.oddAway <= 1.65);
  const moderate =
    pAway >= 0.38 || (input.oddAway != null && input.oddAway <= 2.4);

  if (strong) {
    return pickFromPool(
      [
        { home: 0, away: 2 },
        { home: 1, away: 3 },
        { home: 0, away: 3 },
        { home: 1, away: 2 },
        { home: 0, away: 1 },
      ],
      seed,
    );
  }

  if (moderate) {
    return pickFromPool(
      [
        { home: 1, away: 2 },
        { home: 0, away: 1 },
        { home: 0, away: 2 },
        { home: 2, away: 3 },
        { home: 0, away: 1 },
      ],
      seed,
    );
  }

  return pickFromPool(
    [
      { home: 0, away: 1 },
      { home: 1, away: 2 },
      { home: 0, away: 1 },
      { home: 0, away: 2 },
    ],
    seed,
  );
}

function buildScorePrompt(input: ScorePredictionInput): {
  system: string;
  user: string;
} {
  const oddsLine = [
    input.oddHome != null ? `${input.homeTeam} ${input.oddHome}` : null,
    input.oddDraw != null ? `nul ${input.oddDraw}` : null,
    input.oddAway != null ? `${input.awayTeam} ${input.oddAway}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    system:
      "Tu es un pronostiqueur football. Réponds UNIQUEMENT avec un JSON valide de la forme {\"home\": N, \"away\": M} où N et M sont des entiers entre 0 et 5. Pas de texte autour.",
    user: `Match : ${input.homeTeam} vs ${input.awayTeam}
Cotes 1N2 : ${oddsLine || "non disponibles"}
Propose un score exact crédible selon la force relative des équipes. Varie les résultats (1-0, 2-0, 1-1, 2-1, 0-0…) — évite de toujours sortir 2-1.`,
  };
}

export async function generateScorePrediction(
  input: ScorePredictionInput,
): Promise<ScorePrediction> {
  const hasLlmKey = isAiConfigured();

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
