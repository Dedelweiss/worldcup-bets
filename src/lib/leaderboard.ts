import type { PlayerBadge } from "@/lib/badges";
import { resolveAvatarUrl } from "@/lib/profile/avatars";
import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry, LeaderboardSort } from "@/types/database";

export type { LeaderboardSort };

function mapRow(row: Record<string, unknown>): LeaderboardEntry {
  return {
    id: row.id as string,
    display_name: row.display_name as string | null,
    username: row.username as string | null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    balance: Number(row.balance ?? row.points ?? 0),
    classic_won: Number(row.classic_won ?? 0),
    classic_lost: Number(row.classic_lost ?? 0),
    fun_won: Number(row.fun_won ?? 0),
    fun_lost: Number(row.fun_lost ?? 0),
    total_won: Number(row.total_won ?? 0),
    total_lost: Number(row.total_lost ?? 0),
    on_fire: Boolean(row.on_fire),
    heat_streak: Number(row.heat_streak ?? 0),
    is_ai: Boolean(row.is_ai),
  };
}

function sortPlayers(
  players: LeaderboardEntry[],
  sort: LeaderboardSort,
): LeaderboardEntry[] {
  const copy = [...players];
  copy.sort((a, b) => {
    let diff = 0;
    if (sort === "classic_won") diff = b.classic_won - a.classic_won;
    else if (sort === "fun_won") diff = b.fun_won - a.fun_won;
    else diff = b.balance - a.balance;
    if (diff !== 0) return diff;
    return b.balance - a.balance;
  });
  return copy;
}

async function getLeaderboardFallback(options: {
  leagueId?: string | null;
  sort: LeaderboardSort;
}): Promise<{ players: LeaderboardEntry[]; warning?: string }> {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, display_name, username, avatar_id, avatar_url, points, on_fire, heat_streak");

  if (options.leagueId) {
    const { data: members } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", options.leagueId);

    const ids = (members ?? []).map((m) => m.user_id);
    if (ids.length === 0) return { players: [] };
    query = query.in("id", ids);
  }

  const { data: profiles } = await query;

  const players = (profiles ?? []).map((p) =>
    mapRow({
      ...p,
      avatar_url: resolveAvatarUrl(
        {
          avatar_id: (p as { avatar_id?: string | null }).avatar_id ?? null,
          avatar_url: (p as { avatar_url?: string | null }).avatar_url ?? null,
        },
        p.id as string,
      ),
      classic_won: 0,
      classic_lost: 0,
      fun_won: 0,
      fun_lost: 0,
      total_won: 0,
      total_lost: 0,
    }),
  );

  return {
    players: sortPlayers(players, options.sort),
    warning:
      "Filtres avancés indisponibles. Exécutez supabase/migrations/012_private_leagues_leaderboard.sql dans Supabase.",
  };
}

async function attachPlayerAvatars(
  players: LeaderboardEntry[],
): Promise<LeaderboardEntry[]> {
  if (players.length === 0) return players;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, avatar_id, avatar_url")
    .in(
      "id",
      players.map((p) => p.id),
    );

  if (error) {
    console.error("attachPlayerAvatars", error);
    return players;
  }

  const byId = new Map(
    (data ?? []).map((p) => [
      p.id,
      resolveAvatarUrl(
        {
          avatar_id: p.avatar_id as string | null,
          avatar_url: p.avatar_url as string | null,
        },
        p.id as string,
      ),
    ]),
  );

  return players.map((p) => {
    const resolved = byId.get(p.id) ?? null;
    const fromRpc = p.avatar_url?.trim() || null;
    return {
      ...p,
      avatar_url: resolved ?? fromRpc ?? null,
    };
  });
}

async function attachPlayerBadges(
  players: LeaderboardEntry[],
): Promise<LeaderboardEntry[]> {
  if (players.length === 0) return players;

  const supabase = await createClient();
  const userIds = players.map((p) => p.id);

  const { data, error } = await supabase.rpc("get_users_badges", {
    p_user_ids: userIds,
  });

  if (error || !data) {
    return players;
  }

  const byUser = new Map<string, PlayerBadge[]>();
  for (const row of data as {
    user_id: string;
    badge_id: string;
    name: string;
    description: string;
    icon_name: string;
    unlocked_at: string;
  }[]) {
    const list = byUser.get(row.user_id) ?? [];
    list.push({
      id: row.badge_id,
      name: row.name,
      description: row.description,
      icon_name: row.icon_name,
      unlocked_at: row.unlocked_at,
    });
    byUser.set(row.user_id, list);
  }

  return players.map((p) => ({
    ...p,
    badges: byUser.get(p.id) ?? [],
  }));
}

async function attachLeagueLabels(
  players: LeaderboardEntry[],
): Promise<LeaderboardEntry[]> {
  if (players.length === 0) return players;

  const supabase = await createClient();
  const userIds = players.map((p) => p.id);

  const { data, error } = await supabase.rpc("get_users_league_labels", {
    p_user_ids: userIds,
  });

  if (error || !data) {
    return players;
  }

  const byUser = new Map<string, { id: string; name: string }[]>();
  for (const row of data as { user_id: string; league_id: string; league_name: string }[]) {
    const list = byUser.get(row.user_id) ?? [];
    list.push({ id: row.league_id, name: row.league_name });
    byUser.set(row.user_id, list);
  }

  return players.map((p) => ({
    ...p,
    leagues: byUser.get(p.id) ?? [],
  }));
}

export async function getLeaderboard(options?: {
  leagueId?: string | null;
  sort?: LeaderboardSort;
}): Promise<{
  players: LeaderboardEntry[];
  warning?: string;
}> {
  const sort = options?.sort ?? "points";
  const leagueId = options?.leagueId ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_leaderboard_filtered", {
    p_league_id: leagueId,
    p_sort_by: sort,
  });

  if (error) {
    if (
      error.message.includes("Could not find the function") ||
      error.message.includes("get_leaderboard_filtered")
    ) {
      const legacy = await supabase.rpc("get_leaderboard_stats");
      if (!legacy.error && legacy.data) {
        let players = (legacy.data as Record<string, unknown>[]).map(mapRow);
        if (leagueId) {
          const { data: members } = await supabase
            .from("league_members")
            .select("user_id")
            .eq("league_id", leagueId);
          const ids = new Set((members ?? []).map((m) => m.user_id));
          players = players.filter((p) => ids.has(p.id));
        }
        const labeled = await attachLeagueLabels(sortPlayers(players, sort));
        const withAvatars = await attachPlayerAvatars(labeled);
        return { players: await attachPlayerBadges(withAvatars) };
      }
      const fallback = await getLeaderboardFallback({ leagueId, sort });
      const labeled = await attachLeagueLabels(fallback.players);
      const withAvatars = await attachPlayerAvatars(labeled);
      return {
        ...fallback,
        players: await attachPlayerBadges(withAvatars),
      };
    }
    console.error("get_leaderboard_filtered", error);
    return { players: [] };
  }

  const players = (data ?? []).map((row: Record<string, unknown>) => mapRow(row));
  const labeled = await attachLeagueLabels(players);
  const withAvatars = await attachPlayerAvatars(labeled);
  return { players: await attachPlayerBadges(withAvatars) };
}

export async function getLeaderboardTop3(): Promise<LeaderboardEntry[]> {
  const { players } = await getLeaderboard({ sort: "points" });
  return players.slice(0, 3);
}

export interface LeaderboardRankNeighbor {
  player: LeaderboardEntry;
  /** Écart de points (toujours ≥ 0). */
  gap: number;
}

export interface LeaderboardRankNeighbors {
  /** Joueur classé juste devant (meilleur). */
  above: LeaderboardRankNeighbor | null;
  /** Joueur classé juste derrière. */
  below: LeaderboardRankNeighbor | null;
}

/** Écarts avec le joueur au-dessus et en dessous au classement points. */
export function getLeaderboardRankNeighbors(
  players: LeaderboardEntry[],
  userId: string,
): LeaderboardRankNeighbors {
  const index = players.findIndex((p) => p.id === userId);
  if (index === -1) {
    return { above: null, below: null };
  }

  const me = players[index]!;
  const abovePlayer = index > 0 ? players[index - 1]! : null;
  const belowPlayer =
    index < players.length - 1 ? players[index + 1]! : null;

  return {
    above: abovePlayer
      ? {
          player: abovePlayer,
          gap: Math.max(0, abovePlayer.balance - me.balance),
        }
      : null,
    below: belowPlayer
      ? {
          player: belowPlayer,
          gap: Math.max(0, me.balance - belowPlayer.balance),
        }
      : null,
  };
}

export function parseLeaderboardSort(value: string | undefined): LeaderboardSort {
  if (value === "classic_won" || value === "fun_won") return value;
  if (value === "points" || value === "balance") return "points";
  return "points";
}
