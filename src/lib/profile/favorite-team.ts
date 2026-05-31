import { hasSupabaseConfig } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/types/database";

export interface ProfileFavoriteTeam {
  team: Team;
  chosenAt: string;
}

export async function getProfileFavoriteTeam(
  userId: string,
): Promise<ProfileFavoriteTeam | null> {
  if (!hasSupabaseConfig) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("favorite_team_id, favorite_team_chosen_at")
    .eq("id", userId)
    .maybeSingle();

  if (
    error ||
    !data?.favorite_team_id ||
    !data.favorite_team_chosen_at
  ) {
    return null;
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, code, logo_url")
    .eq("id", data.favorite_team_id)
    .maybeSingle();

  if (!team) return null;

  return {
    team: team as Team,
    chosenAt: data.favorite_team_chosen_at as string,
  };
}
