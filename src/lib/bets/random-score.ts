export interface RandomScore {
  home: number;
  away: number;
}

/** Scores crédibles pour remplissage aléatoire (0–4 buts). */
const SCORE_POOL: RandomScore[] = [
  { home: 1, away: 0 },
  { home: 2, away: 1 },
  { home: 1, away: 1 },
  { home: 0, away: 0 },
  { home: 2, away: 0 },
  { home: 0, away: 1 },
  { home: 1, away: 2 },
  { home: 3, away: 1 },
  { home: 0, away: 2 },
  { home: 2, away: 2 },
  { home: 3, away: 0 },
  { home: 0, away: 3 },
  { home: 1, away: 0 },
  { home: 2, away: 1 },
  { home: 0, away: 1 },
];

export function randomClassicScore(seed?: number): RandomScore {
  const index =
    seed != null
      ? Math.abs(seed) % SCORE_POOL.length
      : Math.floor(Math.random() * SCORE_POOL.length);
  return SCORE_POOL[index] ?? { home: 1, away: 1 };
}
