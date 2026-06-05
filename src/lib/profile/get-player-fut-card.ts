import { getUserBets } from "@/lib/bets";
import { hasSupabaseConfig } from "@/lib/auth-server";
import { getAllMatchesForStats } from "@/lib/matches";
import { resolveAvatarUrl } from "@/lib/profile/avatars";
import { calculateFUTStats } from "@/lib/profile/calculate-fut-stats";
import { getProfileFavoriteTeam } from "@/lib/profile/favorite-team";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { createClient } from "@/lib/supabase/server";
import type { FUTCardStats } from "@/lib/profile/calculate-fut-stats";
import type { Team } from "@/types/database";

export interface PlayerFutCardPayload {
  playerName: string;
  avatarUrl: string | null;
  favoriteTeam: Team | null;
  futStats: FUTCardStats;
}

export async function getPlayerFutCardData(
  userId: string,
): Promise<PlayerFutCardPayload | null> {
  if (!hasSupabaseConfig) return null;

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_id, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) return null;

  const [userBets, favoriteTeam, allMatches] = await Promise.all([
    getUserBets(userId),
    getProfileFavoriteTeam(userId),
    getAllMatchesForStats(),
  ]);

  const avatarUrl = resolveAvatarUrl(profile, profile.id);

  return {
    playerName: getPlayerLabel(profile),
    avatarUrl: avatarUrl ?? profile.avatar_url,
    favoriteTeam: favoriteTeam?.team ?? null,
    futStats: calculateFUTStats(userBets, allMatches),
  };
}
