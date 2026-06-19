import { hasSupabaseConfig } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Fenêtre avant coup d'envoi où on accélère la sync. */
const PRE_KICKOFF_MS = 30 * 60 * 1000;
/** Fenêtre après coup d'envoi (match en cours ou récemment terminé). */
const POST_KICKOFF_MS = 3 * 60 * 60 * 1000;

async function getSupabaseForSync() {
  if (isAdminConfigured()) return createAdminClient();
  return createClient();
}

/** True si au moins un match nécessite une sync score rapide (60 s). */
export async function needsLiveScoreSync(now = Date.now()): Promise<boolean> {
  if (!hasSupabaseConfig) return false;

  try {
    const supabase = await getSupabaseForSync();
    const from = new Date(now - POST_KICKOFF_MS).toISOString();
    const to = new Date(now + PRE_KICKOFF_MS).toISOString();

    const [{ count: liveCount }, { count: windowCount }, { count: unsettledFinished }] =
      await Promise.all([
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("status", "live"),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .in("status", ["scheduled", "live"])
          .gte("kickoff_at", from)
          .lte("kickoff_at", to),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("status", "finished")
          .is("settled_at", null)
          .gte("kickoff_at", from)
          .lte("kickoff_at", to),
      ]);

    return (
      (liveCount ?? 0) > 0 ||
      (windowCount ?? 0) > 0 ||
      (unsettledFinished ?? 0) > 0
    );
  } catch {
    return false;
  }
}
