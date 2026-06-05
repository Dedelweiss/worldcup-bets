/** Aligné sur tackle_stake_for_user (migration 070). */
export const TACKLE_STAKE_MIN = 5;
export const TACKLE_STAKE_MAX = 50;
export const TACKLE_STAKE_RATIO = 0.3;

export function estimateTackleStakeFromPayout(potentialPayout: number): number {
  if (potentialPayout < 1) return TACKLE_STAKE_MIN;
  return Math.min(
    TACKLE_STAKE_MAX,
    Math.max(TACKLE_STAKE_MIN, Math.round(potentialPayout * TACKLE_STAKE_RATIO)),
  );
}

export function formatTackleStakeRange(): string {
  return `${TACKLE_STAKE_MIN}–${TACKLE_STAKE_MAX} pts`;
}

export function tackleRulesSummary(): string {
  return `1 tacle par phase. Si tu fais mieux que ta cible sur ce match, tu vols 30 % de son enjeu (${formatTackleStakeRange()}). Sinon tu perds 30 % du tien.`;
}
