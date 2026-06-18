import { getUserBets } from "@/lib/bets";
import { getAllMatchesForStats } from "@/lib/matches";
import {
  calculateFUTStats,
  type FUTCardStats,
  type FUTStatKey,
} from "@/lib/profile/calculate-fut-stats";

/** Profil joueur sur 4 axes (1–99, affichés sur une échelle 0–100). */
export interface ExpertiseRadarAxis {
  /** Libellé affiché sur le radar. */
  axis: string;
  value: number;
  fullMark: number;
  /** Explication affichée au survol. */
  description: string;
}

/** Axes affichés sur le radar du tableau de bord. */
export const EXPERTISE_RADAR_KEYS: FUTStatKey[] = [
  "PRC",
  "SEC",
  "AUD",
  "REG",
];

export interface ExpertiseRadarData {
  axes: ExpertiseRadarAxis[];
  /** Au moins un pari classique (1N2 ou score exact). */
  hasData: boolean;
  ovr: number;
}

/** Données mock — mode démo sans Supabase. */
export const MOCK_EXPERTISE_RADAR: ExpertiseRadarAxis[] = [
  {
    axis: "Précision",
    value: 68,
    fullMark: 100,
    description:
      "Qualité de vos pronos réglés : scores exacts et résultats 1N2 gagnants.",
  },
  {
    axis: "Sécurité",
    value: 54,
    fullMark: 100,
    description: "Performance sur les favoris (cotes basses).",
  },
  {
    axis: "Audace",
    value: 42,
    fullMark: 100,
    description: "Appétit pour les outsiders et réussite sur ces coups risqués.",
  },
  {
    axis: "Régularité",
    value: 61,
    fullMark: 100,
    description: "Séries de victoires et taux de réussite global.",
  },
];

function isClassicBetType(betType: string): boolean {
  return betType === "match_result" || betType === "exact_score";
}

export function futStatsToExpertiseRadar(
  futStats: FUTCardStats,
): ExpertiseRadarAxis[] {
  const keySet = new Set(EXPERTISE_RADAR_KEYS);
  return futStats.stats
    .filter((stat) => keySet.has(stat.key))
    .map((stat) => ({
      axis: stat.label,
      value: stat.value,
      fullMark: 100,
      description: stat.description,
    }));
}

export async function getExpertiseRadar(
  userId: string,
): Promise<ExpertiseRadarData> {
  const [userBets, allMatches] = await Promise.all([
    getUserBets(userId),
    getAllMatchesForStats(),
  ]);

  const hasData = userBets.some((bet) => isClassicBetType(bet.bet_type));
  const futStats = calculateFUTStats(userBets, allMatches);

  return {
    axes: futStatsToExpertiseRadar(futStats),
    hasData,
    ovr: futStats.ovr,
  };
}
