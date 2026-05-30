"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import { formatLeagueError } from "@/lib/leagues/errors";
import { parseRpcUuid } from "@/lib/leagues/parse-uuid";
import { createClient } from "@/lib/supabase/server";

export type LeagueActionResult =
  | { success: true; leagueId?: string }
  | { success: false; error: string };

export async function joinLeagueByCodeAction(
  code: string,
): Promise<LeagueActionResult> {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("join_league_by_invite_code", {
    p_code: code.trim(),
  });

  if (error) {
    return { success: false, error: formatLeagueError(error.message) };
  }

  const leagueId = parseRpcUuid(data);
  revalidatePath("/leaderboard");
  revalidatePath("/leagues");

  return { success: true, leagueId: leagueId ?? undefined };
}

export async function createPrivateLeagueAction(
  name: string,
): Promise<LeagueActionResult> {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_private_league", {
    p_name: name.trim(),
  });

  if (error) {
    return { success: false, error: formatLeagueError(error.message) };
  }

  const leagueId = parseRpcUuid(data);
  revalidatePath("/leaderboard");
  revalidatePath("/leagues");

  return { success: true, leagueId: leagueId ?? undefined };
}
