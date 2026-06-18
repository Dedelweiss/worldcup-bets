import { hasSupabaseConfig } from "@/lib/auth-server";
import {
  DEFAULT_PREDICTION_CAMPAIGN_ID,
  getPredictionCampaign,
  type PredictionCampaign,
} from "@/lib/onboarding/campaigns";
import type { OnboardingQuestion } from "@/lib/onboarding/types";
import { getQuestionsForCampaign } from "@/lib/onboarding/questions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface PredictionCampaignRow {
  id: string;
  label: string;
  short_label: string;
  emoji: string;
  theme: Record<string, string>;
  intro_title: string;
  intro_subtitle: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PredictionCampaignQuestionRow {
  campaign_id: string;
  question_id: string;
  sort_order: number;
  question_type: "team" | "player" | "choice";
  title: string;
  subtitle: string | null;
  points_potential: number;
  required: boolean;
  config: Record<string, unknown>;
}

function rowToCampaign(row: PredictionCampaignRow): PredictionCampaign {
  const fallback = getPredictionCampaign(row.id);
  const theme = row.theme ?? {};
  return {
    id: row.id,
    label: row.label,
    shortLabel: row.short_label,
    emoji: row.emoji,
    theme: {
      ambient: theme.ambient ?? fallback.theme.ambient,
      orbA: theme.orbA ?? fallback.theme.orbA,
      orbB: theme.orbB ?? fallback.theme.orbB,
      accentClass: theme.accentClass ?? fallback.theme.accentClass,
      badgeClass: theme.badgeClass ?? fallback.theme.badgeClass,
    },
    intro: {
      title: row.intro_title,
      subtitle: row.intro_subtitle,
    },
  };
}

function rowToQuestion(row: PredictionCampaignQuestionRow): OnboardingQuestion {
  const config = row.config ?? {};
  return {
    id: row.question_id,
    type: row.question_type,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    pointsPotential: row.points_potential,
    required: row.required,
    requiresFavoriteTeamOpen: Boolean(config.requiresFavoriteTeamOpen),
    excludeSameTeamAs:
      typeof config.excludeSameTeamAs === "string"
        ? config.excludeSameTeamAs
        : undefined,
    options: Array.isArray(config.options)
      ? (config.options as OnboardingQuestion["options"])
      : undefined,
  };
}

export async function listPredictionCampaigns(): Promise<PredictionCampaignRow[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prediction_campaigns")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    if (error.message.includes("prediction_campaigns")) return [];
    throw error;
  }

  return (data ?? []) as PredictionCampaignRow[];
}

export async function getCampaignQuestionsFromDb(
  campaignId: string,
): Promise<OnboardingQuestion[]> {
  if (!hasSupabaseConfig) {
    return getQuestionsForCampaign(campaignId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prediction_campaign_questions")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    return getQuestionsForCampaign(campaignId);
  }

  return (data as PredictionCampaignQuestionRow[]).map(rowToQuestion);
}

export async function getCampaignFromDb(
  campaignId: string,
): Promise<PredictionCampaign> {
  if (!hasSupabaseConfig) {
    return getPredictionCampaign(campaignId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prediction_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (error || !data) {
    return getPredictionCampaign(campaignId);
  }

  return rowToCampaign(data as PredictionCampaignRow);
}

export async function getActiveCampaignBundle(): Promise<{
  campaignId: string;
  campaign: PredictionCampaign;
  questions: OnboardingQuestion[];
}> {
  const { getActivePredictionCampaignId } = await import(
    "@/lib/onboarding/queries"
  );
  const campaignId = await getActivePredictionCampaignId();
  const [campaign, questions] = await Promise.all([
    getCampaignFromDb(campaignId),
    getCampaignQuestionsFromDb(campaignId),
  ]);
  return { campaignId, campaign, questions };
}

export async function adminUpsertCampaign(input: {
  id: string;
  label: string;
  shortLabel: string;
  emoji: string;
  introTitle: string;
  introSubtitle: string;
  theme?: Record<string, string>;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("prediction_campaigns").upsert({
    id: input.id,
    label: input.label,
    short_label: input.shortLabel,
    emoji: input.emoji,
    intro_title: input.introTitle,
    intro_subtitle: input.introSubtitle,
    theme: input.theme ?? {},
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function adminUpsertCampaignQuestion(input: {
  campaignId: string;
  questionId: string;
  sortOrder: number;
  questionType: "team" | "player" | "choice";
  title: string;
  subtitle?: string;
  pointsPotential: number;
  required: boolean;
  config?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("prediction_campaign_questions").upsert({
    campaign_id: input.campaignId,
    question_id: input.questionId,
    sort_order: input.sortOrder,
    question_type: input.questionType,
    title: input.title,
    subtitle: input.subtitle ?? null,
    points_potential: input.pointsPotential,
    required: input.required,
    config: input.config ?? {},
  });
  if (error) throw error;
}

export async function adminDeleteCampaignQuestion(
  campaignId: string,
  questionId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("prediction_campaign_questions")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("question_id", questionId);
  if (error) throw error;
}

export function slugifyCampaignId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}

export { DEFAULT_PREDICTION_CAMPAIGN_ID };
