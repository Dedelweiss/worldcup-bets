import type { LucideIcon } from "lucide-react";
import {
  Flame,
  Goal,
  Heart,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

export type StepParticleKind =
  | "sparkles"
  | "hearts"
  | "stars"
  | "flames"
  | "confetti";

export type StepIconMotion =
  | "float"
  | "pulse"
  | "bounce"
  | "spin-slow"
  | "wiggle";

export interface OnboardingStepTheme {
  id: string;
  ambient: string;
  orbA: string;
  orbB: string;
  accentClass: string;
  progressBarClass: string;
  icon: LucideIcon;
  iconMotion: StepIconMotion;
  particles: StepParticleKind;
  iconBg: string;
}

const BASE_THEMES: Record<string, Omit<OnboardingStepTheme, "id">> = {
  intro: {
    ambient: "from-violet-600/25 via-fuchsia-600/15 to-transparent",
    orbA: "rgba(167, 139, 250, 0.4)",
    orbB: "rgba(236, 72, 153, 0.25)",
    accentClass: "text-violet-400",
    progressBarClass: "bg-violet-500",
    icon: Sparkles,
    iconMotion: "float",
    particles: "sparkles",
    iconBg: "bg-violet-500/15 ring-violet-500/25",
  },
  favorite_team: {
    ambient: "from-rose-600/25 via-pink-600/15 to-transparent",
    orbA: "rgba(244, 63, 94, 0.4)",
    orbB: "rgba(251, 113, 133, 0.25)",
    accentClass: "text-rose-400",
    progressBarClass: "bg-rose-500",
    icon: Heart,
    iconMotion: "pulse",
    particles: "hearts",
    iconBg: "bg-rose-500/15 ring-rose-500/30",
  },
  top_scorer: {
    ambient: "from-amber-500/25 via-orange-600/15 to-transparent",
    orbA: "rgba(245, 158, 11, 0.4)",
    orbB: "rgba(249, 115, 22, 0.25)",
    accentClass: "text-amber-400",
    progressBarClass: "bg-amber-500",
    icon: Target,
    iconMotion: "bounce",
    particles: "stars",
    iconBg: "bg-amber-500/15 ring-amber-500/30",
  },
  top_assister: {
    ambient: "from-violet-500/25 via-purple-600/15 to-transparent",
    orbA: "rgba(139, 92, 246, 0.4)",
    orbB: "rgba(168, 85, 247, 0.25)",
    accentClass: "text-violet-400",
    progressBarClass: "bg-violet-500",
    icon: Sparkles,
    iconMotion: "float",
    particles: "sparkles",
    iconBg: "bg-violet-500/15 ring-violet-500/30",
  },
  finalist_a: {
    ambient: "from-yellow-500/20 via-amber-600/20 to-transparent",
    orbA: "rgba(234, 179, 8, 0.35)",
    orbB: "rgba(217, 119, 6, 0.3)",
    accentClass: "text-yellow-400",
    progressBarClass: "bg-yellow-500",
    icon: Trophy,
    iconMotion: "wiggle",
    particles: "sparkles",
    iconBg: "bg-yellow-500/15 ring-yellow-500/30",
  },
  finalist_b: {
    ambient: "from-indigo-600/25 via-blue-600/15 to-transparent",
    orbA: "rgba(99, 102, 241, 0.4)",
    orbB: "rgba(59, 130, 246, 0.25)",
    accentClass: "text-indigo-400",
    progressBarClass: "bg-indigo-500",
    icon: Trophy,
    iconMotion: "wiggle",
    particles: "stars",
    iconBg: "bg-indigo-500/15 ring-indigo-500/30",
  },
  most_goals_team: {
    ambient: "from-lime-500/20 via-emerald-600/20 to-transparent",
    orbA: "rgba(132, 204, 22, 0.35)",
    orbB: "rgba(16, 185, 129, 0.3)",
    accentClass: "text-lime-400",
    progressBarClass: "bg-lime-500",
    icon: Goal,
    iconMotion: "bounce",
    particles: "flames",
    iconBg: "bg-lime-500/15 ring-lime-500/30",
  },
  total_goals: {
    ambient: "from-cyan-500/20 via-sky-600/20 to-transparent",
    orbA: "rgba(6, 182, 212, 0.35)",
    orbB: "rgba(14, 165, 233, 0.3)",
    accentClass: "text-cyan-400",
    progressBarClass: "bg-cyan-500",
    icon: Flame,
    iconMotion: "pulse",
    particles: "flames",
    iconBg: "bg-cyan-500/15 ring-cyan-500/30",
  },
  summary: {
    ambient: "from-emerald-500/20 via-violet-600/20 to-amber-500/15",
    orbA: "rgba(52, 211, 153, 0.35)",
    orbB: "rgba(167, 139, 250, 0.3)",
    accentClass: "text-emerald-400",
    progressBarClass: "bg-emerald-500",
    icon: Sparkles,
    iconMotion: "float",
    particles: "confetti",
    iconBg: "bg-emerald-500/15 ring-emerald-500/30",
  },
};

export function getStepTheme(stepKey: string): OnboardingStepTheme {
  const base = BASE_THEMES[stepKey] ?? BASE_THEMES.intro;
  return { id: stepKey, ...base };
}

export function resolveWizardStepKey(
  step:
    | { kind: "intro" }
    | { kind: "summary" }
    | { kind: "question"; questionId: string },
): string {
  if (step.kind === "intro") return "intro";
  if (step.kind === "summary") return "summary";
  return step.questionId;
}

export const stepTransition = {
  initial: { opacity: 0, y: 28, scale: 0.97, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: -20, scale: 0.98, filter: "blur(4px)" },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

export const staggerChild = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 + i * 0.06, duration: 0.4, ease: "easeOut" },
  }),
};

export const iconMotionVariants = {
  float: {
    y: [0, -6, 0],
    transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" as const },
  },
  pulse: {
    scale: [1, 1.08, 1],
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const },
  },
  bounce: {
    y: [0, -8, 0],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeOut" as const },
  },
  "spin-slow": {
    rotate: [0, 8, -8, 0],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
  },
  wiggle: {
    rotate: [0, -6, 6, -4, 0],
    transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" as const },
  },
};
