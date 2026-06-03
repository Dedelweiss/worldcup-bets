import {
  AI_CHAT_AMBIENT_RANDOM_SKIP,
  type AiChatTrigger,
} from "@/lib/ai/chat-limits";
import {
  generateAiChatMessage,
  type AiChatContext,
} from "@/lib/ai/generate-chat-message";
import { createAdminClient } from "@/lib/supabase/admin";

interface EvaluateAiChatResult {
  eligible: boolean;
  reason?: string;
  trigger?: AiChatTrigger;
  match_label?: string;
  status?: string;
  home_score?: number | null;
  away_score?: number | null;
  recent_messages?: {
    author: string;
    message: string;
    is_ai?: boolean;
  }[];
}

function parseEvaluation(data: unknown): EvaluateAiChatResult | null {
  if (!data || typeof data !== "object") return null;
  return data as EvaluateAiChatResult;
}

function toContext(
  evalResult: EvaluateAiChatResult,
  trigger: AiChatTrigger,
): AiChatContext {
  return {
    trigger,
    matchLabel: evalResult.match_label ?? "Match",
    status: evalResult.status ?? "live",
    homeScore: evalResult.home_score ?? null,
    awayScore: evalResult.away_score ?? null,
    recentMessages: evalResult.recent_messages ?? [],
  };
}

async function tryPostAiChat(
  matchId: number,
  trigger: AiChatTrigger,
  options?: { skipRandom?: boolean },
): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return;

  if (
    trigger === "ambient" &&
    !options?.skipRandom &&
    Math.random() < AI_CHAT_AMBIENT_RANDOM_SKIP
  ) {
    return;
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return;
  }

  const { data, error } = await supabase.rpc("evaluate_ai_chat", {
    p_match_id: matchId,
    p_trigger: trigger,
  });

  if (error) {
    console.error(`evaluate_ai_chat ${matchId}:`, error.message);
    return;
  }

  const evaluation = parseEvaluation(data);
  if (!evaluation?.eligible) return;

  const message = await generateAiChatMessage(toContext(evaluation, trigger));

  const { error: postError } = await supabase.rpc("post_ai_match_comment", {
    p_match_id: matchId,
    p_message: message,
  });

  if (postError) {
    console.error(`post_ai_match_comment ${matchId}:`, postError.message);
  }
}

/** Premier message IA au passage en direct (sync live). */
export async function ensureAiKickoffChat(): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return;

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return;
  }

  const { data, error } = await supabase.rpc("get_matches_needing_ai_kickoff_chat");
  if (error || !data?.length) return;

  for (const row of data as { match_id: number }[]) {
    await tryPostAiChat(row.match_id, "kickoff", { skipRandom: true });
  }
}

/** Réaction occasionnelle si le mur est actif (appel client throttlé). */
export async function tryAiAmbientChat(matchId: number): Promise<void> {
  await tryPostAiChat(matchId, "ambient");
}
