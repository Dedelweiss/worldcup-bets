import type { LucideIcon } from "lucide-react";
import {
  Cat,
  Crosshair,
  Medal,
  PartyPopper,
  Rocket,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";

export interface PlayerBadge {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  unlocked_at: string;
}

const ICON_BY_NAME: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  cat: Cat,
  "party-popper": PartyPopper,
  trophy: Trophy,
  crosshair: Crosshair,
  shield: Shield,
  medal: Medal,
  rocket: Rocket,
};

export function getBadgeIcon(iconName: string): LucideIcon {
  return ICON_BY_NAME[iconName] ?? Trophy;
}

/** Catalogue affiché en mode démo (sans Supabase). */
export const MOCK_PLAYER_BADGES: PlayerBadge[] = [
  {
    id: "nostradamus",
    name: "Nostradamus",
    description: "A réussi 3 scores exacts « tout pile ».",
    icon_name: "sparkles",
    unlocked_at: new Date().toISOString(),
  },
  {
    id: "jackpot",
    name: "Le Jackpot",
    description: "A remporté 50 points ou plus sur un seul pari gagnant.",
    icon_name: "trophy",
    unlocked_at: new Date().toISOString(),
  },
];
