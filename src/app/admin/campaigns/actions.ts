"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-server";
import {
  parseChoiceOptions,
  validateChoiceQuestionOptions,
} from "@/lib/prediction-campaigns/choice-options";
import {
  adminDeleteCampaignQuestion,
  adminUpsertCampaign,
  adminUpsertCampaignQuestion,
  slugifyCampaignId,
} from "@/lib/prediction-campaigns/db";
import { createClient } from "@/lib/supabase/server";

export type CampaignActionResult =
  | { success: true }
  | { success: false; error: string };

function mapError(message: string): string {
  if (message.includes("prediction_campaigns")) {
    return "Exécutez la migration 089 dans Supabase.";
  }
  if (message.includes("Cannot delete active")) {
    return "Impossible de supprimer la campagne active.";
  }
  if (message.includes("existing picks")) {
    return "Impossible de supprimer : des joueurs ont déjà répondu.";
  }
  return message;
}

export async function saveCampaignAction(
  formData: FormData,
): Promise<CampaignActionResult> {
  await requireAdmin();

  const idRaw = String(formData.get("id") ?? "").trim();
  const id = slugifyCampaignId(idRaw);
  if (!id) {
    return { success: false, error: "Identifiant invalide." };
  }

  const label = String(formData.get("label") ?? "").trim();
  const shortLabel = String(formData.get("shortLabel") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "🏆").trim() || "🏆";
  const introTitle = String(formData.get("introTitle") ?? "").trim();
  const introSubtitle = String(formData.get("introSubtitle") ?? "").trim();

  if (!label || !shortLabel || !introTitle) {
    return { success: false, error: "Champs obligatoires manquants." };
  }

  try {
    await adminUpsertCampaign({
      id,
      label,
      shortLabel,
      emoji,
      introTitle,
      introSubtitle,
      theme: {
        ambient: String(formData.get("ambient") ?? "").trim(),
        orbA: String(formData.get("orbA") ?? "").trim(),
        orbB: String(formData.get("orbB") ?? "").trim(),
        accentClass: String(formData.get("accentClass") ?? "").trim(),
        badgeClass: String(formData.get("badgeClass") ?? "").trim(),
      },
    });
  } catch (e) {
    return {
      success: false,
      error: mapError(e instanceof Error ? e.message : "Erreur"),
    };
  }

  revalidatePath("/admin/campaigns");
  revalidatePath("/onboarding");
  revalidatePath("/bracket");
  return { success: true };
}

export async function setActiveCampaignAction(
  campaignId: string,
): Promise<CampaignActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_active_prediction_campaign", {
    p_campaign_id: campaignId,
  });

  if (error) {
    return { success: false, error: mapError(error.message) };
  }

  revalidatePath("/admin/campaigns");
  revalidatePath("/onboarding");
  revalidatePath("/bracket");
  return { success: true };
}

export async function deleteCampaignAction(
  campaignId: string,
): Promise<CampaignActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_prediction_campaign", {
    p_campaign_id: campaignId,
  });

  if (error) {
    return { success: false, error: mapError(error.message) };
  }

  revalidatePath("/admin/campaigns");
  return { success: true };
}

export async function saveCampaignQuestionAction(
  formData: FormData,
): Promise<CampaignActionResult> {
  await requireAdmin();

  const campaignId = String(formData.get("campaignId") ?? "").trim();
  const questionId = slugifyCampaignId(
    String(formData.get("questionId") ?? ""),
  );
  const questionType = String(formData.get("questionType") ?? "team") as
    | "team"
    | "player"
    | "choice";
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const pointsPotential = Number(formData.get("pointsPotential") ?? 0);
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const required = formData.get("required") === "on";

  if (!campaignId || !questionId || !title) {
    return { success: false, error: "Champs obligatoires manquants." };
  }

  let config: Record<string, unknown> = {};
  const configRaw = String(formData.get("configJson") ?? "").trim();
  if (configRaw) {
    try {
      config = JSON.parse(configRaw) as Record<string, unknown>;
    } catch {
      return { success: false, error: "JSON de configuration invalide." };
    }
  }

  if (formData.get("requiresFavoriteTeamOpen") === "on") {
    config.requiresFavoriteTeamOpen = true;
  }

  const excludeSame = String(formData.get("excludeSameTeamAs") ?? "").trim();
  if (excludeSame) {
    config.excludeSameTeamAs = excludeSame;
  }

  const optionsRaw = String(formData.get("optionsJson") ?? "").trim();
  if (optionsRaw) {
    try {
      config.options = parseChoiceOptions(JSON.parse(optionsRaw));
    } catch {
      return { success: false, error: "JSON des options invalide." };
    }
  }

  if (questionType === "choice") {
    const options = parseChoiceOptions(config.options);
    const optionsError = validateChoiceQuestionOptions(options);
    if (optionsError) {
      return { success: false, error: optionsError };
    }
    config.options = options;
  } else {
    delete config.options;
  }

  try {
    await adminUpsertCampaignQuestion({
      campaignId,
      questionId,
      sortOrder,
      questionType,
      title,
      subtitle: subtitle || undefined,
      pointsPotential: Number.isFinite(pointsPotential) ? pointsPotential : 0,
      required,
      config,
    });
  } catch (e) {
    return {
      success: false,
      error: mapError(e instanceof Error ? e.message : "Erreur"),
    };
  }

  revalidatePath("/admin/campaigns");
  revalidatePath("/onboarding");
  revalidatePath("/bracket");
  return { success: true };
}

export async function deleteCampaignQuestionAction(
  campaignId: string,
  questionId: string,
): Promise<CampaignActionResult> {
  await requireAdmin();

  try {
    await adminDeleteCampaignQuestion(campaignId, questionId);
  } catch (e) {
    return {
      success: false,
      error: mapError(e instanceof Error ? e.message : "Erreur"),
    };
  }

  revalidatePath("/admin/campaigns");
  revalidatePath("/onboarding");
  revalidatePath("/bracket");
  return { success: true };
}
