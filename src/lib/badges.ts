import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  Bird,
  Brain,
  Cat,
  CloudRain,
  Crown,
  Crosshair,
  Dices,
  Drama,
  Flame,
  FlipHorizontal2,
  Footprints,
  Gem,
  Ghost,
  Globe,
  Heart,
  Laugh,
  Medal,
  MessageCircle,
  Minus,
  Moon,
  PartyPopper,
  RefreshCcw,
  Rocket,
  Shield,
  Skull,
  Sparkles,
  Star,
  Sun,
  Target,
  ThumbsUp,
  Trophy,
  Zap,
} from "lucide-react";

export interface PlayerBadge {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  unlocked_at?: string;
}

export interface BadgeCatalogEntry {
  id: string;
  name: string;
  description: string;
  icon_name: string;
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
  skull: Skull,
  anchor: Anchor,
  "cloud-rain": CloudRain,
  bird: Bird,
  brain: Brain,
  drama: Drama,
  "flip-horizontal": FlipHorizontal2,
  zap: Zap,
  target: Target,
  "message-circle": MessageCircle,
  flame: Flame,
  gem: Gem,
  minus: Minus,
  "thumbs-up": ThumbsUp,
  dices: Dices,
  footprints: Footprints,
  globe: Globe,
  "refresh-ccw": RefreshCcw,
  crown: Crown,
  sun: Sun,
  moon: Moon,
  heart: Heart,
  ghost: Ghost,
  laugh: Laugh,
  star: Star,
};

export const MAX_PROFILE_BADGES = 5;

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
    id: "naze",
    name: "Le Naze",
    description: "A enchaîné 8 paris perdus d'affilée.",
    icon_name: "skull",
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

export const MOCK_BADGE_CATALOG: BadgeCatalogEntry[] = [
  ...MOCK_PLAYER_BADGES.map(({ id, name, description, icon_name }) => ({
    id,
    name,
    description,
    icon_name,
  })),
  {
    id: "chambreur",
    name: "Le Chambreur",
    description: "15 messages sur les murs de match.",
    icon_name: "message-circle",
  },
  {
    id: "on_fire",
    name: "En Feu",
    description: "Mode On Fire activé.",
    icon_name: "flame",
  },
];
