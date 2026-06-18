export interface PredictionCampaignTheme {
  /** Classes Tailwind pour le dégradé d'ambiance */
  ambient: string;
  /** Couleur d'accent (hex) pour les orbes animés */
  orbA: string;
  orbB: string;
  /** Classe texte accent */
  accentClass: string;
  /** Badge campagne */
  badgeClass: string;
}

export interface PredictionCampaign {
  id: string;
  label: string;
  shortLabel: string;
  emoji: string;
  theme: PredictionCampaignTheme;
  intro: {
    title: string;
    subtitle: string;
  };
}

export const DEFAULT_PREDICTION_CAMPAIGN_ID = "wc2026";

export const PREDICTION_CAMPAIGNS: Record<string, PredictionCampaign> = {
  wc2026: {
    id: "wc2026",
    label: "Coupe du Monde 2026",
    shortLabel: "CDM 2026",
    emoji: "🏆",
    theme: {
      ambient:
        "from-emerald-600/20 via-violet-600/15 to-amber-500/10",
      orbA: "rgba(16, 185, 129, 0.35)",
      orbB: "rgba(139, 92, 246, 0.3)",
      accentClass: "text-emerald-400",
      badgeClass:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    },
    intro: {
      title: "Vos pronostics CDM 2026",
      subtitle:
        "Répondez une seule fois — vos choix restent verrouillés pour tout le tournoi.",
    },
  },
  euro2028: {
    id: "euro2028",
    label: "Euro 2028",
    shortLabel: "Euro 2028",
    emoji: "⚽",
    theme: {
      ambient: "from-blue-600/20 via-indigo-600/15 to-sky-500/10",
      orbA: "rgba(59, 130, 246, 0.35)",
      orbB: "rgba(99, 102, 241, 0.3)",
      accentClass: "text-blue-400",
      badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    },
    intro: {
      title: "Vos pronostics Euro 2028",
      subtitle:
        "Un nouveau questionnaire pour ce tournoi — vos réponses CDM 2026 restent archivées.",
    },
  },
};

export function getPredictionCampaign(
  campaignId: string,
): PredictionCampaign {
  return (
    PREDICTION_CAMPAIGNS[campaignId] ?? PREDICTION_CAMPAIGNS.wc2026
  );
}
