import { requireAdmin } from "@/lib/auth-server";
import { fetchAdminMatchBets } from "@/lib/bets/match-live-bets";
import { createClient } from "@/lib/supabase/server";

/** Tous les paris d'un match (admin, y compris fun avant coup d'envoi). */
export async function getAdminMatchBets(matchId: number) {
  await requireAdmin();
  const supabase = await createClient();
  return fetchAdminMatchBets(supabase, matchId);
}
