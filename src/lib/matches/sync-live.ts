import { ensureAiBetsForLiveMatches } from "@/lib/ai/ensure-ai-bets";
import { ensureAiKickoffChat } from "@/lib/ai/ensure-ai-chat";
import { hasSupabaseConfig } from "@/lib/auth-server";
import { syncFootballDataMatches } from "@/lib/matches/sync-football-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const SYNC_INTERVAL_MS = 30_000;

let lastSyncAt = 0;
let syncInFlight: Promise<void> | null = null;

function runAiLiveSideEffects(): void {
  void (async () => {
    try {
      await ensureAiBetsForLiveMatches();
      await ensureAiKickoffChat();
    } catch {
      // Les effets IA ne doivent jamais bloquer une navigation.
    }
  })();
}

async function executeLiveSync(options?: { force?: boolean }): Promise<void> {
  const now = Date.now();
  const skipRpcSync = !options?.force && now - lastSyncAt < SYNC_INTERVAL_MS;

  if (!skipRpcSync) {
    const supabase = isAdminConfigured() ? createAdminClient() : await createClient();
    // football-data d'abord, puis RPC : le passage kickoff → live ne doit pas être écrasé.
    await syncFootballDataMatches();
    await supabase.rpc("sync_live_matches");
    lastSyncAt = Date.now();
  }

  runAiLiveSideEffects();
}

/** Met à jour status → live pour les matchs dont le coup d'envoi est passé. */
export async function syncLiveMatches(options?: {
  force?: boolean;
  /** Lance la sync sans attendre (pages joueur). */
  background?: boolean;
}): Promise<void> {
  if (!hasSupabaseConfig) return;

  if (syncInFlight) {
    if (options?.background) return;
    await syncInFlight;
    return;
  }

  const job = executeLiveSync(options).finally(() => {
    syncInFlight = null;
  });

  syncInFlight = job;

  if (options?.background) return;
  await job;
}
