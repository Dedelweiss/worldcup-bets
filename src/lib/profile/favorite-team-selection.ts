import { hasSupabaseConfig } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function fallbackSelectionOpen(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const { data } = await supabase
    .from("matches")
    .select("kickoff_at")
    .not("status", "in", "(cancelled,postponed)")
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.kickoff_at) return true;
  return new Date(data.kickoff_at as string).getTime() > Date.now();
}

async function checkSelectionOpen(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_favorite_team_selection_open");

  if (error) {
    if (error.message.includes("Could not find the function")) {
      return fallbackSelectionOpen(supabase);
    }
    return fallbackSelectionOpen(supabase);
  }

  return Boolean(data);
}

export async function isFavoriteTeamSelectionOpen(): Promise<boolean> {
  if (!hasSupabaseConfig) return true;

  const supabase = await createClient();
  return checkSelectionOpen(supabase);
}

/** Vérifie la fenêtre de choix sur /signup (client anon sans accès aux matchs). */
export async function isFavoriteTeamSelectionOpenForSignup(): Promise<boolean> {
  if (!hasSupabaseConfig) return true;

  try {
    const supabase = createAdminClient();
    return checkSelectionOpen(supabase);
  } catch {
    return isFavoriteTeamSelectionOpen();
  }
}

export function profileNeedsFavoriteTeam(profile: {
  favorite_team_id?: number | null;
  is_ai?: boolean;
}): boolean {
  if (profile.is_ai) return false;
  return profile.favorite_team_id == null;
}
