import type { TeamSquadPlayer } from "@/types/database";

export type SquadPositionGroup = "gk" | "def" | "mid" | "fwd" | "other";

const GROUP_LABELS: Record<SquadPositionGroup, string> = {
  gk: "Gardiens",
  def: "Défenseurs",
  mid: "Milieux",
  fwd: "Attaquants",
  other: "Autres",
};

const GROUP_ORDER: SquadPositionGroup[] = ["gk", "def", "mid", "fwd", "other"];

export function squadPositionGroup(position: string | null): SquadPositionGroup {
  const p = position?.toLowerCase() ?? "";
  if (p.includes("goal")) return "gk";
  if (p.includes("defen") || p.includes("defence") || p.includes("defense")) return "def";
  if (p.includes("mid")) return "mid";
  if (p.includes("offen") || p.includes("forward") || p.includes("attack") || p.includes("striker")) {
    return "fwd";
  }
  return "other";
}

export function squadPositionLabel(position: string | null): string {
  const group = squadPositionGroup(position);
  if (group === "gk") return "Gardien";
  if (group === "def") return "Défenseur";
  if (group === "mid") return "Milieu";
  if (group === "fwd") return "Attaquant";
  return position ?? "Joueur";
}

export function groupSquadPlayers(
  players: TeamSquadPlayer[],
): { group: SquadPositionGroup; label: string; players: TeamSquadPlayer[] }[] {
  const buckets = new Map<SquadPositionGroup, TeamSquadPlayer[]>();
  for (const group of GROUP_ORDER) buckets.set(group, []);

  for (const player of players) {
    const group = squadPositionGroup(player.position);
    buckets.get(group)!.push(player);
  }

  return GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    players: buckets.get(group) ?? [],
  })).filter((entry) => entry.players.length > 0);
}

export function playerAgeAt(dateOfBirth: string | null, reference = "2026-06-11"): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const ref = new Date(reference);
  if (Number.isNaN(birth.getTime())) return null;
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export interface SquadPositionStyle {
  badgeClass: string;
  iconClass: string;
}

const POSITION_STYLES: Record<SquadPositionGroup, SquadPositionStyle> = {
  gk: {
    badgeClass: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
    iconClass: "text-amber-400",
  },
  def: {
    badgeClass: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
    iconClass: "text-sky-400",
  },
  mid: {
    badgeClass: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
    iconClass: "text-emerald-400",
  },
  fwd: {
    badgeClass: "bg-rose-500/15 text-rose-400 ring-rose-500/25",
    iconClass: "text-rose-400",
  },
  other: {
    badgeClass: "bg-white/10 text-muted-foreground ring-white/10",
    iconClass: "text-muted-foreground",
  },
};

export function squadPositionStyle(position: string | null): SquadPositionStyle {
  return POSITION_STYLES[squadPositionGroup(position)];
}
