"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-server";
import { generateAndSaveMatchSummary } from "@/lib/ai/generate-match-summary";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseRpcUuid } from "@/lib/leagues/parse-uuid";
import { DEFAULT_KNOCKOUT_BET_NOTE } from "@/lib/tournament/constants";
import type { MatchStage, MatchStatus } from "@/types/database";
import type { SyncMatchProvidersResult } from "@/lib/matches/sync-providers";
import type {
  GroupMatchFormValues,
  KnockoutMatchFormValues,
  TournamentTeamFormValues,
} from "@/lib/validations/match-creator";

export type ActionResult =
  | { success: true; matchId?: number; settlement?: Record<string, unknown> }
  | { success: false; error: string };

/** Champ score vide du formulaire admin → NULL en base (efface le score). */
function parseOptionalAdminScore(
  raw: FormDataEntryValue | null,
): number | null {
  if (raw === null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

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
  const homeScore = parseOptionalAdminScore(formData.get("homeScore"));
  const awayScore = parseOptionalAdminScore(formData.get("awayScore"));

  const isGoldenRaw = formData.get("isGolden");
  const p_is_golden =
    isGoldenRaw === "true" || isGoldenRaw === "on"
      ? true
      : isGoldenRaw === "false" || isGoldenRaw === "off"
        ? false
        : null;

  const { error } = await supabase.rpc("admin_update_match", {
    p_match_id: matchId,
    p_status: status,
    p_home_score: homeScore,
    p_away_score: awayScore,
    p_apply_scores: true,
    p_odd_home: formData.get("oddHome")
      ? Number(formData.get("oddHome"))
      : null,
    p_odd_draw: formData.get("oddDraw")
      ? Number(formData.get("oddDraw"))
      : null,
    p_odd_away: formData.get("oddAway")
      ? Number(formData.get("oddAway"))
      : null,
    p_is_golden,
  });

  if (error) {
    const msg = error.message.includes("Could not find the function")
      ? "Exécutez les migrations Supabase 040 et 041 (admin match / statut à venir)."
      : error.message.includes("suppress_auto_live")
        ? "Exécutez supabase/migrations/041_fix_scheduled_status_sync.sql dans Supabase."
        : error.message;
    return { success: false, error: msg };
  }

  await triggerAiBetIfLive(matchId, status);

  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}`);
  return { success: true, matchId };
}

async function triggerAiBetIfLive(
  _matchId: number,
  status: MatchStatus | null,
): Promise<void> {
  if (status !== "live") return;
  const { ensureAiBetsForLiveMatches } = await import("@/lib/ai/ensure-ai-bets");
  await ensureAiBetsForLiveMatches();
}

export async function correctMatchResultAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const matchId = Number(formData.get("matchId"));
  const status = (formData.get("status") as MatchStatus) || null;
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  if (
    Number.isNaN(matchId) ||
    Number.isNaN(homeScore) ||
    Number.isNaN(awayScore)
  ) {
    return { success: false, error: "Score final requis pour la correction." };
  }

  const isGoldenRaw = formData.get("isGolden");
  const p_is_golden =
    isGoldenRaw === "true" || isGoldenRaw === "on"
      ? true
      : isGoldenRaw === "false" || isGoldenRaw === "off"
        ? false
        : null;

  const { data, error } = await supabase.rpc("admin_correct_match_result", {
    p_match_id: matchId,
    p_home_score: homeScore,
    p_away_score: awayScore,
    p_status: status,
    p_odd_home: formData.get("oddHome")
      ? Number(formData.get("oddHome"))
      : null,
    p_odd_draw: formData.get("oddDraw")
      ? Number(formData.get("oddDraw"))
      : null,
    p_odd_away: formData.get("oddAway")
      ? Number(formData.get("oddAway"))
      : null,
    p_is_golden,
  });

  if (error) {
    const msg = error.message.includes("Could not find the function")
      ? "Exécutez supabase/migrations/040_admin_match_correction.sql dans Supabase."
      : error.message;
    return { success: false, error: msg };
  }

  await triggerAiBetIfLive(matchId, status);

  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/bets");

  return {
    success: true,
    matchId,
    settlement: data as Record<string, unknown>,
  };
}

export async function reopenMatchAction(matchId: number): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("reopen_match_settlement", {
    p_match_id: matchId,
    p_target_status: null,
  });

  if (error) {
    const msg = error.message.includes("Could not find the function")
      ? "Exécutez supabase/migrations/040_admin_match_correction.sql dans Supabase."
      : error.message;
    return { success: false, error: msg };
  }

  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/bets");
  revalidatePath(`/matches/${matchId}`);

  return { success: true, matchId, settlement: data as Record<string, unknown> };
}

export async function resettleMatchAction(matchId: number): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_resettle_match", {
    p_match_id: matchId,
  });

  if (error) {
    const msg = error.message.includes("Could not find the function")
      ? "Exécutez supabase/migrations/040_admin_match_correction.sql dans Supabase."
      : error.message;
    return { success: false, error: msg };
  }

  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/bets");
  revalidatePath(`/matches/${matchId}`);

  return { success: true, matchId, settlement: data as Record<string, unknown> };
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

  const { data, error } = await supabase.rpc("admin_delete_match", {
    p_match_id: matchId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const summary = data as Record<string, unknown> | null;

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/bets");
  revalidatePath("/leaderboard");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");

  return {
    success: true,
    settlement: summary ?? undefined,
  };
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
      ? "Fonction admin_reset_app absente. Exécutez les migrations admin_reset dans Supabase."
      : error.message.includes("UPDATE requires a WHERE clause")
        ? "Exécutez supabase/migrations/037_fix_admin_reset_where.sql dans Supabase."
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

export async function adminSetUserUsernameAction(
  userId: string,
  username: string,
): Promise<ActionResult & { username?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_set_user_username", {
    p_user_id: userId,
    p_username: username,
  });

  if (error) {
    const msg = error.message.includes("Could not find the function")
      ? "Exécutez supabase/migrations/036_admin_profile_edit.sql dans Supabase."
      : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
  revalidatePath("/matches");

  return { success: true, username: data as string };
}

export async function adminSetUserFavoriteTeamAction(
  userId: string,
  teamId: number | null,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_set_user_favorite_team", {
    p_user_id: userId,
    p_team_id: teamId,
  });

  if (error) {
    const msg = error.message.includes("Could not find the function")
      ? "Exécutez supabase/migrations/036_admin_profile_edit.sql dans Supabase."
      : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");

  return { success: true };
}

export async function setWorldCupWinnerAction(
  teamId: number,
  bonusPoints: number,
): Promise<ActionResult & { summary?: Record<string, unknown> }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_set_world_cup_winner", {
    p_team_id: teamId,
    p_bonus_points: bonusPoints,
  });

  if (error) {
    const msg = error.message.includes("Could not find the function")
      ? "Exécutez supabase/migrations/035_favorite_team.sql dans Supabase."
      : error.message.includes("already settled")
        ? "Le vainqueur a déjà été désigné et les bonus distribués."
        : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/admin/teams");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
  revalidatePath("/bets");

  return { success: true, summary: data as Record<string, unknown> };
}

export async function setDashboardAnnouncementAction(
  enabled: boolean,
  message: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_set_dashboard_announcement", {
    p_enabled: enabled,
    p_message: message.trim(),
  });

  if (error) {
    const msg = error.message.includes("Could not find the function")
      ? "Exécutez supabase/migrations/066_dashboard_announcement.sql dans Supabase."
      : error.message.includes("trop long")
        ? "Le message ne peut pas dépasser 500 caractères."
        : error.message.includes("requis")
          ? "Saisissez un message avant d'activer l'annonce."
          : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function generateGazetteAction(
  matchId: number,
  overwrite = false,
): Promise<ActionResult & { summary?: string }> {
  await requireAdmin();

  const result = await generateAndSaveMatchSummary(matchId, { overwrite });
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}`);

  return { success: true, matchId, summary: result.summary };
}

export async function syncFootballDataAdminAction(): Promise<
  ActionResult & { stats?: SyncMatchProvidersResult }
> {
  await requireAdmin();

  const { syncMatchProviders } = await import(
    "@/lib/matches/sync-providers"
  );
  const stats = await syncMatchProviders({ force: true, includeOdds: true });

  if (!stats.ok) {
    return {
      success: false,
      error: stats.error ?? "Synchronisation API matchs échouée.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/matches");

  return { success: true, stats };
}

export async function prepareWorldCupAction(options: {
  startingBalance: number;
  syncOddsAfter?: boolean;
}): Promise<
  ActionResult & {
    summary?: Record<string, unknown>;
    syncStats?: SyncMatchProvidersResult;
  }
> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_prepare_world_cup", {
    p_starting_balance: options.startingBalance,
  });

  if (error) {
    const msg = error.message.includes("Could not find the function")
      ? "Exécutez supabase/migrations/058_admin_prepare_world_cup.sql dans Supabase."
      : error.message;
    return { success: false, error: msg };
  }

  let syncStats: SyncMatchProvidersResult | undefined;
  if (options.syncOddsAfter !== false) {
    const { syncMatchProviders } = await import(
      "@/lib/matches/sync-providers"
    );
    syncStats = await syncMatchProviders({
      force: true,
      includeOdds: true,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  revalidatePath("/bets");

  return {
    success: true,
    summary: data as Record<string, unknown>,
    syncStats,
  };
}
