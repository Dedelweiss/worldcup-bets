import { CampaignsAdminPanel } from "@/components/admin/campaigns-admin-panel";
import {
  listPredictionCampaigns,
  type PredictionCampaignQuestionRow,
} from "@/lib/prediction-campaigns/db";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin · Formulaires thématiques" };

async function loadQuestionsByCampaign(): Promise<
  Record<string, PredictionCampaignQuestionRow[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prediction_campaign_questions")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data) return {};

  return data.reduce<Record<string, PredictionCampaignQuestionRow[]>>(
    (acc, row) => {
      const campaignId = row.campaign_id as string;
      const list = acc[campaignId] ?? [];
      list.push(row as PredictionCampaignQuestionRow);
      acc[campaignId] = list;
      return acc;
    },
    {},
  );
}

export default async function AdminCampaignsPage() {
  const [campaigns, questionsByCampaign] = await Promise.all([
    listPredictionCampaigns(),
    loadQuestionsByCampaign(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Formulaires thématiques
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Créez et gérez les campagnes de pronostics (ex. CDM 2026). La
          campagne active détermine le questionnaire d&apos;onboarding et les
          statistiques du pool sur la page Tournoi.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-muted-foreground">
          Aucune campagne en base. Exécutez la migration{" "}
          <code className="text-foreground">089_prediction_campaigns_db.sql</code>{" "}
          dans Supabase, ou créez une campagne ci-dessous.
        </p>
      ) : null}

      <CampaignsAdminPanel
        campaigns={campaigns}
        questionsByCampaign={questionsByCampaign}
      />
    </div>
  );
}
