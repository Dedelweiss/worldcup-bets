/** Limites pour les messages IA dans le mur des chambrages. */
export const AI_CHAT_MAX_MESSAGES_PER_MATCH = 8;
export const AI_CHAT_MIN_INTERVAL_MS = 3 * 60 * 1000;
export const AI_CHAT_AMBIENT_RANDOM_SKIP = 0.1;
export const AI_CHAT_AMBIENT_DELAY_MS = 12_000;

export type AiChatTrigger = "kickoff" | "ambient";
