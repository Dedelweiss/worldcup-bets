export interface GlobalLiveChatTeam {
  name: string;
  code: string | null;
  logo_url: string | null;
}

export interface GlobalLiveChatMessage {
  id: string;
  match_id: number;
  user_id: string;
  message: string;
  created_at: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  home_team: GlobalLiveChatTeam;
  away_team: GlobalLiveChatTeam;
}

export interface GlobalLiveChatInitial {
  messages: GlobalLiveChatMessage[];
  liveMatchIds: number[];
}

export const GLOBAL_LIVE_CHAT_COMMENT_SELECT = `
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

function normalizeTeam(raw: unknown): GlobalLiveChatTeam {
  const row = (Array.isArray(raw) ? raw[0] : raw) as
    | Record<string, unknown>
    | null
    | undefined;
  return {
    name: String(row?.name ?? "—"),
    code: (row?.code as string | null) ?? null,
    logo_url: (row?.logo_url as string | null) ?? null,
  };
}

export function mapGlobalLiveChatRow(row: unknown): GlobalLiveChatMessage | null {
  const r = row as Record<string, unknown>;
  const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
  const match = Array.isArray(r.matches) ? r.matches[0] : r.matches;
  const m = match as Record<string, unknown> | null | undefined;

  if (!m || m.status !== "live") return null;

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
    home_team: normalizeTeam(m.home_team),
    away_team: normalizeTeam(m.away_team),
  };
}

export function formatGlobalChatMatchLabel(
  message: Pick<GlobalLiveChatMessage, "home_team" | "away_team">,
): string {
  const home =
    message.home_team.code?.toUpperCase() ??
    message.home_team.name.slice(0, 3).toUpperCase();
  const away =
    message.away_team.code?.toUpperCase() ??
    message.away_team.name.slice(0, 3).toUpperCase();
  return `${home} · ${away}`;
}
