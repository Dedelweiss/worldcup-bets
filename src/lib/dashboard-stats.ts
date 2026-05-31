import { createClient } from "@/lib/supabase/server";
import type { DashboardStats } from "@/types/database";

export type { DashboardStats };

export async function getDashboardStats(
  userId: string,
  currentPoints: number,
): Promise<DashboardStats> {
  const supabase = await createClient();

  const [pendingRes, profilesRes] = await Promise.all([
    supabase
      .from("bets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending"),
    supabase.from("profiles").select("id, points"),
  ]);

  const pendingBets = pendingRes.count ?? 0;

  const players = profilesRes.data ?? [];
  const totalPlayers = players.length;
  const ahead = players.filter((p) => Number(p.points) > currentPoints).length;
  const rank = totalPlayers > 0 ? ahead + 1 : null;

  return {
    pendingBets,
    rank,
    totalPlayers,
  };
}
