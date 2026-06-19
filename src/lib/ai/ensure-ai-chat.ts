import {
  AI_CHAT_AMBIENT_RANDOM_SKIP,
  type AiChatTrigger,
} from "@/lib/ai/chat-limits";
import { ensureAiBetForMatch } from "@/lib/ai/ensure-ai-bets";
import {
  generateAiChatMessage,
  type AiChatContext,
} from "@/lib/ai/generate-chat-message";
import { logAppEvent } from "@/lib/logging/app-logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminConfigured } from "@/lib/supabase/env";

interface EvaluateAiChatResult {
  eligible: boolean;
  reason?: string;
  trigger?: AiChatTrigger;
  match_label?: string;
  status?: string;
  home_score?: number | null;
  away_score?: number | null;
  ai_bet_home?: number | null;
  ai_bet_away?: number | null;
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
    aiBetHome: evalResult.ai_bet_home ?? null,
    aiBetAway: evalResult.ai_bet_away ?? null,
    recentMessages: evalResult.recent_messages ?? [],
  };
}

function getAdminSupabase(): ReturnType<typeof createAdminClient> | null {
  if (!isAdminConfigured()) return null;

  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

async function tryPostAiChat(
  matchId: number,
  trigger: AiChatTrigger,
  options?: { skipRandom?: boolean },
): Promise<boolean> {
  const supabase = getAdminSupabase();
  if (!supabase) return false;

  if (
    trigger === "ambient" &&
    !options?.skipRandom &&
    Math.random() < AI_CHAT_AMBIENT_RANDOM_SKIP
  ) {
    return false;
  }

  const { data, error } = await supabase.rpc("evaluate_ai_chat", {
    p_match_id: matchId,
    p_trigger: trigger,
  });

  if (error) {
    logAppEvent({
      level: "error",
      source: "ai.chat",
      message: error.message,
      metadata: { matchId, trigger },
    });
    return false;
  }

  const evaluation = parseEvaluation(data);
  if (!evaluation?.eligible) {
    if (process.env.NODE_ENV !== "production" && evaluation?.reason) {
      console.info(
        `ai_chat skip match ${matchId} (${trigger}): ${evaluation.reason}`,
      );
    }
    return false;
  }

  const message = await generateAiChatMessage(toContext(evaluation, trigger));

  const { error: postError } = await supabase.rpc("post_ai_match_comment", {
    p_match_id: matchId,
    p_message: message,
  });

  if (postError) {
    logAppEvent({
      level: "error",
      source: "ai.chat",
      message: postError.message,
      metadata: { matchId, trigger, stage: "post" },
    });
    return false;
  }

  return true;
}

/** Premier message IA au passage en direct (sync live). */
export async function ensureAiKickoffChat(): Promise<void> {
  const supabase = getAdminSupabase();
  if (!supabase) return;

  const { data, error } = await supabase.rpc("get_matches_needing_ai_kickoff_chat");
  if (error || !data?.length) return;

  for (const row of data as { match_id: number }[]) {
    await ensureAiBetForMatch(row.match_id);
    await tryPostAiChat(row.match_id, "kickoff", { skipRandom: true });
  }
}

/** Kickoff puis réaction ambiante pour un match (page mur des chambrages). */
export async function ensureAiChatForMatch(matchId: number): Promise<void> {
  if (!getAdminSupabase()) return;

  await ensureAiBetForMatch(matchId);
  const kickoffPosted = await tryPostAiChat(matchId, "kickoff", {
    skipRandom: true,
  });
  if (!kickoffPosted) {
    await tryPostAiChat(matchId, "ambient");
  }
}

/** Réaction occasionnelle si le mur est actif (appel client throttlé). */
export async function tryAiAmbientChat(matchId: number): Promise<void> {
  await ensureAiBetForMatch(matchId);
  await tryPostAiChat(matchId, "ambient");
}
