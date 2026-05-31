"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import type { MatchCommentRow } from "@/lib/match-comments";
import { canPlaceBetOnMatch, getMatchById } from "@/lib/matches";
import { createClient } from "@/lib/supabase/server";
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
    return "Le boost ne s'applique qu'aux paris classiques 1N2.";
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
  revalidatePath("/dashboard");
  revalidatePath("/bets");
  revalidatePath("/leaderboard");

  return { success: true, betId: betId as string };
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

  revalidatePath(`/matches/${matchId}`);

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
