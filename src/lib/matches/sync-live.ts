import { ensureAiBetsForLiveMatches } from "@/lib/ai/ensure-ai-bets";
import { ensureAiKickoffChat } from "@/lib/ai/ensure-ai-chat";
import { hasSupabaseConfig } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SYNC_INTERVAL_MS = 30_000;

let lastSyncAt = 0;
let syncInFlight: Promise<void> | null = null;

/** Met à jour status → live pour les matchs dont le coup d'envoi est passé. */
export async function syncLiveMatches(options?: {
  force?: boolean;
}): Promise<void> {
  if (!hasSupabaseConfig) return;

  const now = Date.now();
  const skipRpcSync =
    !options?.force && now - lastSyncAt < SYNC_INTERVAL_MS;

  if (syncInFlight) {
    await syncInFlight;
    if (skipRpcSync) {
      await runAiLiveSideEffects();
    }
    return;
  }

  syncInFlight = (async () => {
    try {
      if (!skipRpcSync) {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
        const supabase = serviceRoleKey
          ? createAdminClient()
          : await createClient();
        await supabase.rpc("sync_live_matches");
      }
      await runAiLiveSideEffects();
      if (!skipRpcSync) {
        lastSyncAt = Date.now();
      }
    } finally {
      syncInFlight = null;
    }
  })();

  await syncInFlight;
}

async function runAiLiveSideEffects(): Promise<void> {
  await ensureAiBetsForLiveMatches();
  await ensureAiKickoffChat();
}
