import { hasSupabaseConfig } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";

/** Met à jour status → live pour les matchs dont le coup d'envoi est passé */
export async function syncLiveMatches(): Promise<void> {
  if (!hasSupabaseConfig) return;

  const supabase = await createClient();
  await supabase.rpc("sync_live_matches");
}
