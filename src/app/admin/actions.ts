"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { MatchStatus } from "@/types/database";

export type ActionResult =
  | { success: true; matchId?: number; settlement?: Record<string, unknown> }
  | { success: false; error: string };

export async function createMatchAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const homeTeam = String(formData.get("homeTeam") ?? "").trim();
  const awayTeam = String(formData.get("awayTeam") ?? "").trim();
  const kickoffAt = String(formData.get("kickoffAt") ?? "");
  const oddHome = Number(formData.get("oddHome"));
  const oddDraw = Number(formData.get("oddDraw"));
  const oddAway = Number(formData.get("oddAway"));
  const round = String(formData.get("round") ?? "").trim() || null;
  const venue = String(formData.get("venue") ?? "").trim() || null;

  if (!homeTeam || !awayTeam || !kickoffAt) {
    return { success: false, error: "Équipes et date obligatoires." };
  }

  const { data: matchId, error } = await supabase.rpc("admin_create_match", {
    p_home_team_name: homeTeam,
    p_away_team_name: awayTeam,
    p_kickoff_at: new Date(kickoffAt).toISOString(),
    p_odd_home: oddHome,
    p_odd_draw: oddDraw,
    p_odd_away: oddAway,
    p_round: round,
    p_venue: venue,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, matchId: matchId as number };
}

export async function updateMatchAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const matchId = Number(formData.get("matchId"));
  const status = (formData.get("status") as MatchStatus) || null;
  const homeScoreRaw = formData.get("homeScore");
  const awayScoreRaw = formData.get("awayScore");
  const homeScore =
    homeScoreRaw === "" || homeScoreRaw === null
      ? null
      : Number(homeScoreRaw);
  const awayScore =
    awayScoreRaw === "" || awayScoreRaw === null
      ? null
      : Number(awayScoreRaw);

  const { error } = await supabase.rpc("admin_update_match", {
    p_match_id: matchId,
    p_status: status,
    p_home_score: homeScore,
    p_away_score: awayScore,
    p_odd_home: formData.get("oddHome")
      ? Number(formData.get("oddHome"))
      : null,
    p_odd_draw: formData.get("oddDraw")
      ? Number(formData.get("oddDraw"))
      : null,
    p_odd_away: formData.get("oddAway")
      ? Number(formData.get("oddAway"))
      : null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, matchId };
}

export async function settleMatchAction(matchId: number): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("settle_match", {
    p_match_id: matchId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/bets");
  return { success: true, matchId, settlement: data as Record<string, unknown> };
}

export async function deleteMatchAction(matchId: number): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { count } = await supabase
    .from("bets")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId);

  if (count && count > 0) {
    return {
      success: false,
      error: "Impossible de supprimer : des paris existent sur ce match.",
    };
  }

  const { error } = await supabase.from("matches").delete().eq("id", matchId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}
