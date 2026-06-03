/** Profil joueur sur 4 axes (0–100). */
export interface ExpertiseRadarAxis {
  /** Libellé affiché sur le radar. */
  axis: string;
  value: number;
  fullMark: number;
}

/** Données mock — remplacer par getExpertiseRadar(profileId) côté serveur. */
export const MOCK_EXPERTISE_RADAR: ExpertiseRadarAxis[] = [
  { axis: "Précision", value: 68, fullMark: 100 },
  { axis: "Sécurité", value: 54, fullMark: 100 },
  { axis: "Audace", value: 42, fullMark: 100 },
  { axis: "Intuition", value: 61, fullMark: 100 },
];
