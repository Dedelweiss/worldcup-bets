import { hasSupabaseConfig } from "@/lib/auth-server";
import {
  DEFAULT_PREDICTION_CAMPAIGN_ID,
} from "@/lib/onboarding/campaigns";
import type {
  OnboardingPlayerOption,
  TournamentPickRow,
} from "@/lib/onboarding/types";
import { createClient } from "@/lib/supabase/server";
import type { TeamSquadPlayer } from "@/types/database";

export async function getActivePredictionCampaignId(): Promise<string> {
  if (!hasSupabaseConfig) return DEFAULT_PREDICTION_CAMPAIGN_ID;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_active_prediction_campaign");

  if (error) {
    const { data: row } = await supabase
      .from("tournament_config")
      .select("active_prediction_campaign")
      .eq("id", 1)
      .maybeSingle();
    return (
      (row?.active_prediction_campaign as string | undefined) ??
      DEFAULT_PREDICTION_CAMPAIGN_ID
    );
  }

  return (data as string) || DEFAULT_PREDICTION_CAMPAIGN_ID;
}

export async function userNeedsPredictionOnboarding(
  userId: string,
): Promise<boolean> {
  if (!hasSupabaseConfig) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("user_needs_prediction_onboarding");

  if (error) {
    if (error.message.includes("user_needs_prediction_onboarding")) {
      return fallbackNeedsOnboarding(supabase, userId);
    }
    return fallbackNeedsOnboarding(supabase, userId);
  }

  return Boolean(data);
}

async function fallbackNeedsOnboarding(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { getActiveOnboardingQuestionsAsync } = await import(
    "@/lib/onboarding/questions"
  );
  const { isFavoriteTeamSelectionOpen } = await import(
    "@/lib/profile/favorite-team-selection"
  );

  const [profileRes, campaignId, selectionOpen] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "onboarding_campaign_id, onboarding_completed_at, is_ai, favorite_team_id",
      )
      .eq("id", userId)
      .maybeSingle(),
    getActivePredictionCampaignId(),
    isFavoriteTeamSelectionOpen(),
  ]);

  const profile = profileRes.data as {
    onboarding_campaign_id?: string | null;
    onboarding_completed_at?: string | null;
    is_ai?: boolean;
    favorite_team_id?: number | null;
  } | null;
  if (!profile || profile.is_ai) return false;

  if (
    profile.onboarding_campaign_id !== undefined &&
    profile.onboarding_campaign_id !== campaignId
  ) {
    return true;
  }

  const questions = await getActiveOnboardingQuestionsAsync(
    campaignId,
    selectionOpen,
  );
  const picks = await getUserTournamentPicks(userId, campaignId);
  const answered = new Set(picks.map((p) => p.question_id));

  if (
    profile.favorite_team_id != null &&
    questions.some((q) => q.id === "favorite_team")
  ) {
    answered.add("favorite_team");
  }

  const missingRequired = questions.some(
    (q) => q.required && !answered.has(q.id),
  );
  if (missingRequired) return true;

  if (profile.onboarding_campaign_id === undefined) {
    return profile.onboarding_completed_at == null;
  }

  return false;
}

export async function getUserTournamentPicks(
  userId: string,
  campaignId?: string,
): Promise<TournamentPickRow[]> {
  if (!hasSupabaseConfig) return [];

  const activeCampaign = campaignId ?? (await getActivePredictionCampaignId());
  const supabase = await createClient();

  let query = supabase
    .from("tournament_picks")
    .select("question_id, answer, points_potential, campaign_id")
    .eq("user_id", userId);

  const { data, error } = await query.eq("campaign_id", activeCampaign);

  if (error) {
    if (
      error.message.includes("Could not find the table") ||
      error.message.includes("campaign_id")
    ) {
      const legacy = await supabase
        .from("tournament_picks")
        .select("question_id, answer, points_potential")
        .eq("user_id", userId);
      if (legacy.error) return [];
      return (legacy.data ?? []).map((row) => ({
        question_id: row.question_id as string,
        answer: row.answer as TournamentPickRow["answer"],
        points_potential: Number(row.points_potential ?? 0),
      }));
    }
    throw error;
  }

  return (data ?? []).map((row) => ({
    question_id: row.question_id as string,
    answer: row.answer as TournamentPickRow["answer"],
    points_potential: Number(row.points_potential ?? 0),
  }));
}

export async function getTournamentSquadPlayers(): Promise<
  OnboardingPlayerOption[]
> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, code, squad")
    .not("tournament_group_id", "is", null)
    .order("name");

  if (error) return [];

  const players: OnboardingPlayerOption[] = [];

  for (const team of data ?? []) {
    const squad = team.squad as TeamSquadPlayer[] | null;
    if (!Array.isArray(squad)) continue;

    for (const p of squad) {
      if (!p?.id || !p.name) continue;
      players.push({
        playerId: p.id,
        playerName: p.name,
        teamId: team.id as number,
        teamName: team.name as string,
        teamCode: (team.code as string | null) ?? null,
        position: p.position ?? null,
        shirtNumber: p.shirtNumber ?? null,
      });
    }
  }

  return players.sort((a, b) =>
    a.playerName.localeCompare(b.playerName, "fr"),
  );
}

export async function getOnboardingContext(userId: string) {
  const campaignId = await getActivePredictionCampaignId();
  const { getCampaignFromDb } = await import("@/lib/prediction-campaigns/db");
  const campaign = await getCampaignFromDb(campaignId);
  const needsOnboarding = await userNeedsPredictionOnboarding(userId);
  const picks = await getUserTournamentPicks(userId, campaignId);

  let completedCampaignId: string | null = null;
  if (hasSupabaseConfig) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_campaign_id")
      .eq("id", userId)
      .maybeSingle();
    completedCampaignId =
      (data?.onboarding_campaign_id as string | null | undefined) ?? null;
  }

  return {
    campaignId,
    campaign,
    needsOnboarding,
    picks,
    completedCampaignId,
  };
}
