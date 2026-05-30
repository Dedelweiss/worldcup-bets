"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseRpcUuid } from "@/lib/leagues/parse-uuid";
import { DEFAULT_KNOCKOUT_BET_NOTE } from "@/lib/tournament/constants";
import type { MatchStage, MatchStatus } from "@/types/database";
import type {
  GroupMatchFormValues,
  KnockoutMatchFormValues,
  TournamentTeamFormValues,
} from "@/lib/validations/match-creator";

export type ActionResult =
  | { success: true; matchId?: number; settlement?: Record<string, unknown> }
  | { success: false; error: string };

export async function createLeagueAction(
  name: string,
): Promise<ActionResult & { leagueId?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_create_league", {
    p_name: name.trim(),
  });

  if (error) {
    return {
      success: false,
      error: error.message.includes("Could not find")
        ? "Exécutez supabase/migrations/012_private_leagues_leaderboard.sql dans Supabase."
        : error.message,
    };
  }

  const leagueId = parseRpcUuid(data);
  if (!leagueId) {
    return {
      success: false,
      error:
        "La ligue a peut‑être été créée, mais l’identifiant n’a pas été renvoyé. Rechargez /admin/leagues.",
    };
  }

  revalidatePath("/admin/leagues");
  revalidatePath(`/admin/leagues/${leagueId}`);
  revalidatePath("/leaderboard");
  return { success: true, leagueId };
}

export async function setLeagueMembersAction(
  leagueId: string,
  userIds: string[],
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_set_league_members", {
    p_league_id: leagueId,
    p_user_ids: userIds,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/leagues/${leagueId}`);
  revalidatePath("/admin/leagues");
  revalidatePath("/leaderboard");
  return { success: true };
}

export async function deleteLeagueAction(leagueId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_delete_league", {
    p_league_id: leagueId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/leagues");
  revalidatePath("/leaderboard");
  return { success: true };
}

export async function createGroupMatchAction(
  values: GroupMatchFormValues,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: matchId, error } = await supabase.rpc("admin_create_group_match", {
    p_tournament_group_id: values.tournamentGroupId,
    p_home_team_id: values.homeTeamId,
    p_away_team_id: values.awayTeamId,
    p_kickoff_at: new Date(values.kickoffAt).toISOString(),
    p_odd_home: values.oddHome,
    p_odd_draw: values.oddDraw,
    p_odd_away: values.oddAway,
    p_matchday: values.matchday,
    p_venue: values.venue?.trim() || null,
  });

  if (error) {
    return {
      success: false,
      error: error.message.includes("Could not find")
        ? "Exécutez supabase/migrations/011_tournament_groups_stages.sql dans Supabase."
        : error.message,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath("/bracket");
  return { success: true, matchId: matchId as number };
}

export async function createKnockoutMatchAction(
  values: KnockoutMatchFormValues,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: matchId, error } = await supabase.rpc("admin_create_knockout_match", {
    p_stage: values.stage as MatchStage,
    p_home_team_id: values.homeTeamId,
    p_away_team_id: values.awayTeamId,
    p_kickoff_at: new Date(values.kickoffAt).toISOString(),
    p_odd_home: values.oddHome,
    p_odd_draw: values.oddDraw,
    p_odd_away: values.oddAway,
    p_bracket_slot_id: values.bracketSlotId?.trim() || null,
    p_venue: values.venue?.trim() || null,
    p_bet_scope_note:
      values.betScopeNote?.trim() || DEFAULT_KNOCKOUT_BET_NOTE,
  });

  if (error) {
    return {
      success: false,
      error: error.message.includes("Could not find")
        ? "Exécutez supabase/migrations/011_tournament_groups_stages.sql dans Supabase."
        : error.message,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath("/bracket");
  return { success: true, matchId: matchId as number };
}

export async function upsertTournamentTeamAction(
  values: TournamentTeamFormValues,
): Promise<ActionResult & { teamId?: number }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: teamId, error } = await supabase.rpc("admin_upsert_tournament_team", {
    p_tournament_group_id: values.tournamentGroupId,
    p_group_position: values.groupPosition,
    p_name: values.name,
    p_country_code: values.countryCode,
  });

  if (error) {
    return {
      success: false,
      error: error.message.includes("Could not find")
        ? "Exécutez supabase/migrations/011_tournament_groups_stages.sql dans Supabase."
        : error.message,
    };
  }

  revalidatePath("/admin/teams");
  revalidatePath("/admin/matches/new");
  return { success: true, teamId: teamId as number };
}

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

export async function createFunMarketAction(
  formData: FormData,
): Promise<ActionResult & { marketId?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const matchId = Number(formData.get("matchId"));
  const question = String(formData.get("question") ?? "").trim();
  const oddYes = Number(formData.get("oddYes"));
  const oddNo = Number(formData.get("oddNo"));

  if (!question) {
    return { success: false, error: "Question obligatoire." };
  }

  const { data, error } = await supabase.rpc("admin_create_fun_market", {
    p_match_id: matchId,
    p_question: question,
    p_odd_yes: oddYes,
    p_odd_no: oddNo,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}`);
  return { success: true, matchId, marketId: data as string };
}

export async function settleFunMarketAction(
  marketId: string,
  winningOutcome: "yes" | "no",
  matchId: number,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("settle_fun_market", {
    p_market_id: marketId,
    p_winning_outcome: winningOutcome,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/bets");
  return { success: true, settlement: data as Record<string, unknown> };
}

export async function adjustBalanceAction(
  formData: FormData,
): Promise<ActionResult & { newBalance?: number }> {
  await requireAdmin();
  const supabase = await createClient();

  const userId = String(formData.get("userId"));
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!userId || Number.isNaN(amount) || amount === 0) {
    return { success: false, error: "Joueur et montant requis (non nul)." };
  }

  const { data, error } = await supabase.rpc("admin_adjust_balance", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
  });

  if (error) {
    const msg = error.message.includes("Could not find the function")
      ? "Fonction admin_adjust_balance absente. Exécutez supabase/migrations/005_fix_admin_adjust_balance.sql dans le SQL Editor Supabase."
      : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/admin/users");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true, newBalance: data as number };
}

export async function resetAppAction(options: {
  deleteMatches: boolean;
  startingBalance: number;
}): Promise<ActionResult & { summary?: Record<string, unknown> }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_reset_app", {
    p_delete_matches: options.deleteMatches,
    p_starting_balance: options.startingBalance,
  });

  if (error) {
    const msg = error.message.includes("Could not find the function")
      ? "Fonction admin_reset_app absente. Exécutez supabase/migrations/007_admin_reset_app.sql dans Supabase."
      : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/bets");

  return { success: true, summary: data as Record<string, unknown> };
}

export async function deleteUserAccountAction(
  userId: string,
): Promise<ActionResult> {
  const adminProfile = await requireAdmin();

  if (userId === adminProfile.id) {
    return {
      success: false,
      error: "Vous ne pouvez pas supprimer votre propre compte.",
    };
  }

  const supabase = await createClient();

  const { error: dataError } = await supabase.rpc("admin_delete_user_data", {
    p_user_id: userId,
  });

  if (dataError) {
    const msg = dataError.message.includes("Could not find the function")
      ? "Exécutez supabase/migrations/008_admin_delete_user.sql dans Supabase."
      : dataError.message;
    return { success: false, error: msg };
  }

  try {
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.deleteUser(userId);

    if (authError) {
      return {
        success: false,
        error: `Données supprimées mais Auth a échoué : ${authError.message}. Vérifiez SUPABASE_SERVICE_ROLE_KEY.`,
      };
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY requis.",
    };
  }

  revalidatePath("/admin/users");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  revalidatePath("/bets");

  return { success: true };
}
