import {
  mapGlobalLiveChatRow,
  type GlobalLiveChatInitial,
} from "@/lib/global-live-chat";
import { createClient } from "@/lib/supabase/server";

const COMMENT_SELECT = `
  id,
  match_id,
  user_id,
  message,
  created_at,
  profiles (display_name, username, avatar_url),
  matches!inner (
    status,
    home_team:teams!matches_home_team_id_fkey (name, code, logo_url),
    away_team:teams!matches_away_team_id_fkey (name, code, logo_url)
  )
`;

export async function getGlobalLiveChatInitial(
  limit = 30,
): Promise<GlobalLiveChatInitial> {
  const supabase = await createClient();

  const { data: liveMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "live");

  const liveMatchIds = (liveMatches ?? []).map((m) => m.id as number);
  if (liveMatchIds.length === 0) {
    return { messages: [], liveMatchIds: [] };
  }

  const { data, error } = await supabase
    .from("match_comments")
    .select(COMMENT_SELECT)
    .in("match_id", liveMatchIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return { messages: [], liveMatchIds };
  }

  const messages = data
    .map(mapGlobalLiveChatRow)
    .filter((m) => m != null);

  return { messages: messages.reverse(), liveMatchIds };
}
