export type OnboardingQuestionType = "team" | "player" | "choice";

export interface OnboardingChoiceOption {
  id: string;
  label: string;
  description?: string;
}

export interface OnboardingQuestion {
  id: string;
  type: OnboardingQuestionType;
  title: string;
  subtitle?: string;
  /** Points si pronostic correct en fin de tournoi */
  pointsPotential: number;
  required: boolean;
  /** Masquée si le choix d'équipe favorite est fermé */
  requiresFavoriteTeamOpen?: boolean;
  /** question_id dont la team_id doit être différente */
  excludeSameTeamAs?: string;
  options?: OnboardingChoiceOption[];
}

export type TeamPickAnswer = { team_id: number };

export type PlayerPickAnswer = {
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
};

export type ChoicePickAnswer = { choice_id: string };

export type TournamentPickAnswer =
  | TeamPickAnswer
  | PlayerPickAnswer
  | ChoicePickAnswer;

export interface TournamentPickRow {
  question_id: string;
  answer: TournamentPickAnswer;
  points_potential: number;
}

export interface OnboardingPlayerOption {
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  teamCode: string | null;
  position: string | null;
  shirtNumber: number | null;
}
