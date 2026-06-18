"use server";

import { revalidatePath } from "next/cache";
import { setFavoriteTeamAction } from "@/app/(app)/dashboard/favorite-team-actions";
import { requireAuth } from "@/lib/auth-server";
import {
  findOnboardingQuestionAsync,
  getRequiredQuestionIdsAsync,
} from "@/lib/onboarding/questions";
import { getActivePredictionCampaignId } from "@/lib/onboarding/queries";
import type {
  ChoicePickAnswer,
  PlayerPickAnswer,
  TeamPickAnswer,
  TournamentPickAnswer,
} from "@/lib/onboarding/types";
import { isFavoriteTeamSelectionOpen } from "@/lib/profile/favorite-team-selection";
import { createClient } from "@/lib/supabase/server";

export type SaveOnboardingPickResult =
  | { success: true }
  | { success: false; error: string };

function mapRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("onboarding already completed")) {
    return "Vous avez déjà terminé ce questionnaire.";
  }
  if (m.includes("missing required")) {
    return "Certaines réponses obligatoires n'ont pas été enregistrées. Revenez en arrière et validez chaque question.";
  }
  if (m.includes("could not find the function")) {
    return "Exécutez les migrations 087–088 dans Supabase.";
  }
  if (m.includes("already chosen")) {
    return "Équipe favorite déjà enregistrée — votre choix a été conservé.";
  }
  return message;
}

export async function saveOnboardingPickAction(
  campaignId: string,
  questionId: string,
  answer: TournamentPickAnswer,
): Promise<SaveOnboardingPickResult> {
  const profile = await requireAuth();
  const question = await findOnboardingQuestionAsync(campaignId, questionId);
  if (!question) {
    return { success: false, error: "Question inconnue." };
  }

  if (question.type === "team") {
    const teamAnswer = answer as TeamPickAnswer;
    if (!teamAnswer?.team_id) {
      return { success: false, error: "Choisissez une équipe." };
    }

    if (question.id === "favorite_team") {
      const alreadySet = profile.favorite_team_id != null;
      if (!alreadySet) {
        const favResult = await setFavoriteTeamAction(teamAnswer.team_id);
        if (!favResult.success) {
          return favResult;
        }
      } else if (profile.favorite_team_id !== teamAnswer.team_id) {
        return {
          success: false,
          error: "Votre équipe favorite est déjà verrouillée.",
        };
      }
    }
  }

  if (question.type === "player") {
    const playerAnswer = answer as PlayerPickAnswer;
    if (!playerAnswer?.player_id || !playerAnswer.player_name) {
      return { success: false, error: "Choisissez un joueur." };
    }
  }

  if (question.type === "choice") {
    const choiceAnswer = answer as ChoicePickAnswer;
    const valid = question.options?.some((o) => o.id === choiceAnswer?.choice_id);
    if (!valid) {
      return { success: false, error: "Choix invalide." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_tournament_pick", {
    p_question_id: questionId,
    p_answer: answer,
    p_points_potential: question.pointsPotential,
  });

  if (error) {
    return { success: false, error: mapRpcError(error.message) };
  }

  revalidatePath("/onboarding");
  return { success: true };
}

export async function completeOnboardingAction(
  campaignId: string,
): Promise<SaveOnboardingPickResult> {
  const profile = await requireAuth();
  const selectionOpen = await isFavoriteTeamSelectionOpen();
  const requiredIds = await getRequiredQuestionIdsAsync(
    campaignId,
    selectionOpen,
  );

  const supabase = await createClient();

  if (
    profile.favorite_team_id != null &&
    requiredIds.includes("favorite_team") &&
    !(await hasTournamentPick(supabase, profile.id, campaignId, "favorite_team"))
  ) {
    const { error: favError } = await supabase.rpc("upsert_tournament_pick", {
      p_question_id: "favorite_team",
      p_answer: { team_id: profile.favorite_team_id },
      p_points_potential: 0,
    });
    if (favError) {
      return { success: false, error: mapRpcError(favError.message) };
    }
  }

  const { error } = await supabase.rpc("complete_onboarding", {
    p_required_question_ids: requiredIds,
  });

  if (error) {
    return { success: false, error: mapRpcError(error.message) };
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return { success: true };
}

async function hasTournamentPick(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  campaignId: string,
  questionId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("tournament_picks")
    .select("question_id")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .eq("question_id", questionId)
    .maybeSingle();

  return data != null;
}

export async function getOnboardingCampaignIdAction(): Promise<string> {
  return getActivePredictionCampaignId();
}
