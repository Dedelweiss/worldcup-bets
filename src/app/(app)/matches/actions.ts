"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import type { MatchCommentRow } from "@/lib/match-comments";
import { parseRevealedPlayerBet, type RevealedPlayerBet } from "@/lib/bets/reveal-player-bet";
import { canPlaceBetOnMatch, getMatchById } from "@/lib/matches";
import { createClient } from "@/lib/supabase/server";
import { MATCH_RESULT_COPY } from "@/lib/bets/match-result-copy";
import type { MatchResultSelection } from "@/types/database";

export type PlaceBetResult =
  | { success: true; betId: string }
  | { success: false; error: string };

function mapBetError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("betting is closed") || m.includes("already started")) {
    return "Les paris sont fermés pour ce match.";
  }
  if (m.includes("odds have changed")) {
    return "Les cotes ont changé. Actualisez la page.";
  }
  if (m.includes("no boost available")) {
    return "Vous avez déjà utilisé votre Boost x2 pour ce tournoi.";
  }
  if (m.includes("boost only allowed")) {
    return MATCH_RESULT_COPY.boostHint;
  }
  if (m.includes("already have a classic bet")) {
    return MATCH_RESULT_COPY.alreadyOnMatchClassic;
  }
  return message;
}

export async function placeBetAction(
  matchId: number,
  selection: MatchResultSelection,
  useBoost = false,
): Promise<PlaceBetResult> {
  await requireAuth();

  const match = await getMatchById(matchId);
  if (!match) {
    return { success: false, error: "Match introuvable." };
  }

  const { allowed, reason } = canPlaceBetOnMatch(match);
  if (!allowed) {
    return { success: false, error: reason ?? "Paris impossible." };
  }

  const oddMap = {
    home: match.odd_home!,
    draw: match.odd_draw!,
    away: match.odd_away!,
  };
  const odd = oddMap[selection];

  const supabase = await createClient();
  const { data: betId, error } = await supabase.rpc("place_bet", {
    p_match_id: matchId,
    p_bet_type: "match_result",
    p_selection: { selection },
    p_odd: odd,
    p_stake: 0,
    p_use_boost: useBoost,
  });

  if (error) {
    return { success: false, error: mapBetError(error.message) };
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  revalidatePath("/matches/quick");
  revalidatePath("/bracket");
  revalidatePath("/dashboard");
  revalidatePath("/bets");
  revalidatePath("/leaderboard");

  return { success: true, betId: betId as string };
}

export async function placeExactScoreBetAction(
  matchId: number,
  homeScore: number,
  awayScore: number,
  useBoost = false,
): Promise<PlaceBetResult> {
  await requireAuth();

  const match = await getMatchById(matchId);
  if (!match) {
    return { success: false, error: "Match introuvable." };
  }

  const { allowed, reason } = canPlaceBetOnMatch(match);
  if (!allowed) {
    return { success: false, error: reason ?? "Paris impossible." };
  }

  const supabase = await createClient();
  const { data: betId, error } = await supabase.rpc("place_bet", {
    p_match_id: matchId,
    p_bet_type: "exact_score",
    p_selection: { home: homeScore, away: awayScore },
    p_odd: 3,
    p_stake: 0,
    p_use_boost: useBoost,
  });

  if (error) {
    const m = error.message.toLowerCase();
    if (
      m.includes("already have a pending exact score") ||
      m.includes("already have a classic bet")
    ) {
      return {
        success: false,
        error:
          MATCH_RESULT_COPY.alreadyOnMatchClassic,
      };
    }
    if (m.includes("invalid exact score")) {
      return { success: false, error: "Score invalide." };
    }
    return { success: false, error: mapBetError(error.message) };
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/dashboard");
  revalidatePath("/bets");
  revalidatePath("/leaderboard");

  return { success: true, betId: betId as string };
}

export type FillRandomClassicScoresResult =
  | { success: true; placed: number; failed: number }
  | { success: false; error: string };

/** Score exact aléatoire sur tous les matchs sans pronostic classique. */
export async function fillRandomClassicScoresAction(): Promise<FillRandomClassicScoresResult> {
  const profile = await requireAuth();
  const { getMatchesWithoutClassicBet } = await import(
    "@/lib/bets/eligible-classic-bets"
  );
  const { randomClassicScore } = await import("@/lib/bets/random-score");

  const eligible = await getMatchesWithoutClassicBet(profile.id);
  if (eligible.length === 0) {
    return { success: true, placed: 0, failed: 0 };
  }

  const supabase = await createClient();
  let placed = 0;
  let failed = 0;

  for (const match of eligible) {
    const score = randomClassicScore(match.id);
    const { error } = await supabase.rpc("place_bet", {
      p_match_id: match.id,
      p_bet_type: "exact_score",
      p_selection: { home: score.home, away: score.away },
      p_odd: 3,
      p_stake: 0,
      p_use_boost: false,
    });

    if (error) {
      failed += 1;
      if (process.env.NODE_ENV === "development") {
        console.error(
          `[fillRandomClassicScores] match ${match.id}:`,
          error.message,
        );
      }
    } else {
      placed += 1;
    }
  }

  revalidatePath("/matches");
  revalidatePath("/matches/quick");
  revalidatePath("/dashboard");
  revalidatePath("/bets");
  revalidatePath("/leaderboard");

  return { success: true, placed, failed };
}

export type PlaceTackleResult =
  | { success: true; tackleId: string }
  | { success: false; error: string };

function mapTackleError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already used")) {
    return "Tu as déjà utilisé ton tacle pour cette phase.";
  }
  if (m.includes("must have a classic bet")) {
    return "Tu dois avoir un pronostic classique sur ce match.";
  }
  if (m.includes("target has no classic bet")) {
    return "Ce rival n'a pas encore parié sur ce match.";
  }
  if (m.includes("cannot tackle yourself")) {
    return "Tu ne peux pas te tacler toi-même.";
  }
  if (m.includes("kickoff") || m.includes("before match")) {
    return "Le tacle est fermé pour ce match.";
  }
  if (m.includes("not your tackle")) {
    return "Ce tacle ne t'appartient pas.";
  }
  if (m.includes("already resolved")) {
    return "Ce tacle est déjà réglé.";
  }
  if (m.includes("target unchanged")) {
    return "Tu as déjà sélectionné ce rival.";
  }
  if (m.includes("tackle not found")) {
    return "Tacle introuvable.";
  }
  return message;
}

export async function cancelTackleAction(
  tackleId: string,
  matchId: number,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_tackle", {
    p_tackle_id: tackleId,
  });

  if (error) {
    return { success: false, error: mapTackleError(error.message) };
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/leaderboard");

  return { success: true };
}

export async function updateTackleAction(
  tackleId: string,
  matchId: number,
  targetId: string,
): Promise<PlaceTackleResult> {
  await requireAuth();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_tackle", {
    p_tackle_id: tackleId,
    p_target_id: targetId,
  });

  if (error) {
    return { success: false, error: mapTackleError(error.message) };
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/leaderboard");

  return { success: true, tackleId: data as string };
}

export async function placeTackleAction(
  matchId: number,
  targetId: string,
): Promise<PlaceTackleResult> {
  await requireAuth();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_tackle", {
    p_match_id: matchId,
    p_target_id: targetId,
  });

  if (error) {
    return { success: false, error: mapTackleError(error.message) };
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/leaderboard");

  return { success: true, tackleId: data as string };
}

export type PostMatchCommentResult =
  | { success: true; comment: MatchCommentRow }
  | { success: false; error: string };

export async function postMatchCommentAction(
  matchId: number,
  message: string,
): Promise<PostMatchCommentResult> {
  const profile = await requireAuth();

  const supabase = await createClient();
  const { data: commentId, error } = await supabase.rpc("post_match_comment", {
    p_match_id: matchId,
    p_message: message,
  });

  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("chat opens")) {
      return {
        success: false,
        error: "Le chat s'ouvre au coup d'envoi du match.",
      };
    }
    if (m.includes("too long")) {
      return { success: false, error: "Message trop long (500 caractères max)." };
    }
    if (m.includes("empty")) {
      return { success: false, error: "Le message ne peut pas être vide." };
    }
    return { success: false, error: error.message };
  }

  const { data: row } = await supabase
    .from("match_comments")
    .select(
      `
      id,
      match_id,
      user_id,
      message,
      created_at,
      profiles (display_name, username, avatar_url)
    `,
    )
    .eq("id", commentId as string)
    .single();

  if (!row) {
    return { success: true, comment: {
      id: commentId as string,
      match_id: matchId,
      user_id: profile.id,
      message: message.trim(),
      created_at: new Date().toISOString(),
      display_name: profile.display_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
    } };
  }

  const r = row as Record<string, unknown>;
  const pRaw = r.profiles;
  const p = Array.isArray(pRaw) ? pRaw[0] : pRaw;
  const prof = p as {
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;

  return {
    success: true,
    comment: {
      id: r.id as string,
      match_id: r.match_id as number,
      user_id: r.user_id as string,
      message: r.message as string,
      created_at: r.created_at as string,
      display_name: prof?.display_name ?? profile.display_name,
      username: prof?.username ?? profile.username,
      avatar_url: prof?.avatar_url ?? profile.avatar_url,
    },
  };
}

export type RevealPlayerBetResult =
  | { success: true; bet: RevealedPlayerBet }
  | { success: false; error: string };

export async function revealPlayerBetAction(
  matchId: number,
  targetUserId: string,
): Promise<RevealPlayerBetResult> {
  await requireAuth();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_player_match_bet_for_reveal", {
    p_match_id: matchId,
    p_target_user_id: targetUserId,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("could not find the function")) {
      return {
        success: false,
        error:
          "Exécutez supabase/migrations/049_player_bet_reveal.sql dans Supabase.",
      };
    }
    if (msg.includes("not started")) {
      return {
        success: false,
        error:
          "Pronostics indisponibles — exécutez supabase/migrations/052_reveal_fix_live.sql dans Supabase.",
      };
    }
    if (msg.includes("revealable only")) {
      return {
        success: false,
        error: "Révélation possible uniquement pendant ou après le match.",
      };
    }
    if (msg.includes("no classic bet")) {
      return { success: false, error: "Ce joueur n'a pas de pari classique." };
    }
    return { success: false, error: error.message };
  }

  const bet = parseRevealedPlayerBet(data);
  if (!bet) {
    return { success: false, error: "Réponse invalide." };
  }

  return { success: true, bet };
}

/** Déclenche (si conditions OK) un message IA sur le mur (kickoff ou réaction). */
export async function maybeTriggerAiChatAction(matchId: number): Promise<void> {
  await requireAuth();
  const { ensureAiChatForMatch } = await import("@/lib/ai/ensure-ai-chat");
  await ensureAiChatForMatch(matchId);
}
