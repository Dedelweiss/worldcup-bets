import { effectivePoints } from "@/lib/bets/live-provisional-points";
import { formatPoints } from "@/lib/format";
import { getPlayerLabel } from "@/lib/profile/player-label";
import { ON_FIRE_STREAK_REQUIRED } from "@/lib/on-fire";
import type {
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardSort,
} from "@/types/database";

export const LEADERBOARD_EXPORT_MAX_ROWS = 15;

export interface LeaderboardShareRow {
  rank: number;
  label: string;
  value: string;
  medal?: "gold" | "silver" | "bronze";
  onFire?: boolean;
  isAi?: boolean;
}

export interface LeaderboardShareMeta {
  title: string;
  subtitle: string;
  sortLabel: string;
  dateLabel: string;
  rows: LeaderboardShareRow[];
  overflowCount: number;
}

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .toLowerCase();
}

export function leaderboardSortLabel(sort: LeaderboardSort): string {
  if (sort === "classic_won") return "Paris matchs gagnés";
  if (sort === "fun_won") return "Paris fun gagnés";
  if (sort === "live_points") return "Classement live";
  return "Points";
}

export function leaderboardDisplayValue(
  player: LeaderboardEntry,
  sort: LeaderboardSort,
): string {
  if (sort === "classic_won") return String(player.classic_won);
  if (sort === "fun_won") return String(player.fun_won);
  if (sort === "live_points") {
    return formatPoints(effectivePoints(player.balance, player.live_points));
  }
  return formatPoints(player.balance);
}

function medalForRank(rank: number): LeaderboardShareRow["medal"] {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return undefined;
}

function playerOnFire(player: LeaderboardEntry): boolean {
  return (
    Boolean(player.on_fire) ||
    (player.heat_streak ?? 0) >= ON_FIRE_STREAK_REQUIRED
  );
}

export function buildLeaderboardShareMeta(
  players: LeaderboardEntry[],
  options: {
    scope: LeaderboardScope;
    sort: LeaderboardSort;
    leagueName?: string | null;
  },
): LeaderboardShareMeta {
  const visible = players.slice(0, LEADERBOARD_EXPORT_MAX_ROWS);
  const overflowCount = Math.max(0, players.length - visible.length);

  const title =
    options.scope === "general"
      ? "Classement général"
      : options.leagueName
        ? `Ligue « ${options.leagueName} »`
        : "Classement ligue";

  const subtitle =
    options.scope === "general"
      ? "WC2026 Pool — tous les joueurs"
      : "WC2026 Pool — ligue privée";

  return {
    title,
    subtitle,
    sortLabel: leaderboardSortLabel(options.sort),
    dateLabel: new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    rows: visible.map((player, index) => ({
      rank: index + 1,
      label: getPlayerLabel(player),
      value: leaderboardDisplayValue(player, options.sort),
      medal: medalForRank(index + 1),
      onFire: options.scope === "general" && playerOnFire(player),
      isAi: player.is_ai,
    })),
    overflowCount,
  };
}

export function leaderboardExportFilename(
  scope: LeaderboardScope,
  leagueName?: string | null,
): string {
  if (scope === "league" && leagueName) {
    const slug = sanitizeFilename(leagueName) || "ligue";
    return `wc2026-classement-${slug}.png`;
  }
  return "wc2026-classement-general.png";
}
