/** UUID fixe du profil pronostiqueur IA (migration 047). */
export const AI_PLAYER_ID = "a1000000-0000-4000-8000-000000000001";

export function isAiPlayer(userId: string | null | undefined): boolean {
  return userId === AI_PLAYER_ID;
}
