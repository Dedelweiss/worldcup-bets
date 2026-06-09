import { createClient } from "@/lib/supabase/server";
import type { DashboardStats } from "@/types/database";

export type { DashboardStats };

export async function getDashboardStats(
  userId: string,
  currentPoints: number,
): Promise<DashboardStats> {
  const supabase = await createClient();

  const [pendingRes, aheadRes, totalRes] = await Promise.all([
    supabase
      .from("bets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gt("points", currentPoints),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),
  ]);

  const pendingBets = pendingRes.count ?? 0;
  const totalPlayers = totalRes.count ?? 0;
  const ahead = aheadRes.count ?? 0;
  const rank = totalPlayers > 0 ? ahead + 1 : null;

  return {
    pendingBets,
    rank,
    totalPlayers,
  };
}
