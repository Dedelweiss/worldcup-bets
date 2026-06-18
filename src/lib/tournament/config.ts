import { hasSupabaseConfig } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/types/database";

export const DEFAULT_FAVORITE_TEAM_BONUS = 100;

export interface TournamentConfig {
  favoriteTeamBonusPoints: number;
  worldCupWinnerTeamId: number | null;
  worldCupWinnerTeam: Team | null;
  favoriteBonusSettled: boolean;
  dashboardAnnouncementEnabled: boolean;
  dashboardAnnouncementMessage: string;
  activePredictionCampaign: string;
}

const EMPTY_CONFIG: TournamentConfig = {
  favoriteTeamBonusPoints: DEFAULT_FAVORITE_TEAM_BONUS,
  worldCupWinnerTeamId: null,
  worldCupWinnerTeam: null,
  favoriteBonusSettled: false,
  dashboardAnnouncementEnabled: false,
  dashboardAnnouncementMessage: "",
  activePredictionCampaign: "wc2026",
};

async function fetchTeam(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: number,
): Promise<Team | null> {
  const { data } = await supabase
    .from("teams")
    .select("id, name, code, logo_url")
    .eq("id", teamId)
    .maybeSingle();
  return (data as Team | null) ?? null;
}

export async function getTournamentConfig(): Promise<TournamentConfig> {
  if (!hasSupabaseConfig) return { ...EMPTY_CONFIG };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_config")
    .select(
      "favorite_team_bonus_points, world_cup_winner_team_id, favorite_bonus_settled_at, dashboard_announcement_enabled, dashboard_announcement_message, active_prediction_campaign",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return { ...EMPTY_CONFIG };
  }

  const winnerId = data.world_cup_winner_team_id as number | null;
  const winnerTeam =
    winnerId != null ? await fetchTeam(supabase, winnerId) : null;

  return {
    favoriteTeamBonusPoints: Number(
      data.favorite_team_bonus_points ?? DEFAULT_FAVORITE_TEAM_BONUS,
    ),
    worldCupWinnerTeamId: winnerId,
    worldCupWinnerTeam: winnerTeam,
    favoriteBonusSettled: data.favorite_bonus_settled_at != null,
    dashboardAnnouncementEnabled: Boolean(
      data.dashboard_announcement_enabled ?? false,
    ),
    dashboardAnnouncementMessage: String(
      data.dashboard_announcement_message ?? "",
    ).trim(),
    activePredictionCampaign: String(
      data.active_prediction_campaign ?? "wc2026",
    ),
  };
}
