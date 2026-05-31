import { createClient } from "@/lib/supabase/server";
import { getPlayerLabel } from "@/lib/profile/player-label";

export interface MatchCommentRow {
  id: string;
  match_id: number;
  user_id: string;
  message: string;
  created_at: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export async function getMatchComments(
  matchId: number,
): Promise<MatchCommentRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
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
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error || !data) return [];

  return data.map((row) => {
    const r = row as Record<string, unknown>;
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const p = profile as {
      display_name?: string | null;
      username?: string | null;
      avatar_url?: string | null;
    } | null;

    return {
      id: r.id as string,
      match_id: r.match_id as number,
      user_id: r.user_id as string,
      message: r.message as string,
      created_at: r.created_at as string,
      display_name: p?.display_name ?? null,
      username: p?.username ?? null,
      avatar_url: p?.avatar_url ?? null,
    };
  });
}

export function matchCommentAuthorLabel(comment: MatchCommentRow): string {
  return getPlayerLabel(comment);
}
