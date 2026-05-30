import { hasSupabaseConfig } from "@/lib/auth-server";
import { normalizeMatch, MATCH_SELECT } from "@/lib/matches";
import { syncLiveMatches } from "@/lib/matches/sync-live";
import { createClient } from "@/lib/supabase/server";
import type {
  BracketSlotWithMatch,
  MatchStage,
  MatchWithTeams,
  TournamentGroup,
  TournamentTeam,
} from "@/types/database";

export async function getTournamentGroups(): Promise<TournamentGroup[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_groups")
    .select("id, letter, name")
    .order("id");

  if (error) return [];
  return data as TournamentGroup[];
}

export async function getTeamsByTournamentGroup(
  groupId: number,
): Promise<TournamentTeam[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id, name, code, logo_url, tournament_group_id, group_position",
    )
    .eq("tournament_group_id", groupId)
    .order("group_position", { ascending: true });

  if (error) return [];
  return data as TournamentTeam[];
}

export async function getAllTournamentTeams(): Promise<TournamentTeam[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id, name, code, logo_url, tournament_group_id, group_position, tournament_group:tournament_groups (id, letter, name)",
    )
    .not("tournament_group_id", "is", null)
    .order("tournament_group_id")
    .order("group_position");

  if (error) return [];

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const g = r.tournament_group;
    return {
      ...r,
      tournament_group: Array.isArray(g) ? g[0] : g,
    } as TournamentTeam;
  });
}

export type MatchListFilter = "all" | "group" | "knockout";

export async function listMatchesForPlayers(options: {
  filter: MatchListFilter;
  groupId?: number;
  limit?: number;
}): Promise<MatchWithTeams[]> {
  if (!hasSupabaseConfig) return [];

  await syncLiveMatches();
  const supabase = await createClient();

  let query = supabase
    .from("matches")
    .select(
      `
      ${MATCH_SELECT},
      stage,
      tournament_group_id,
      bet_scope_note,
      tournament_group:tournament_groups (id, letter, name)
    `,
    )
    .in("status", ["scheduled", "live"])
    .order("kickoff_at", { ascending: true })
    .limit(options.limit ?? 50);

  if (options.filter === "group") {
    query = query.eq("stage", "group");
    if (options.groupId) {
      query = query.eq("tournament_group_id", options.groupId);
    }
  } else if (options.filter === "knockout") {
    query = query.neq("stage", "group");
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => {
    const m = normalizeMatch(row) as MatchWithTeams & Record<string, unknown>;
    const g = m.tournament_group;
    return {
      ...m,
      stage: (row as { stage: MatchStage }).stage ?? "group",
      tournament_group_id:
        (row as { tournament_group_id: number | null }).tournament_group_id ??
        null,
      bet_scope_note:
        (row as { bet_scope_note: string | null }).bet_scope_note ?? null,
      tournament_group: Array.isArray(g) ? g[0] : g,
    } as MatchWithTeams;
  });
}

export async function getBracketSlots(): Promise<BracketSlotWithMatch[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bracket_slots")
    .select(
      `
      id, stage, label, bracket_order, match_id,
      match:matches (
        ${MATCH_SELECT},
        stage, home_score, away_score, status
      )
    `,
    )
    .order("stage")
    .order("bracket_order");

  if (error || !data) return [];

  const stageOrder: MatchStage[] = [
    "r32",
    "r16",
    "qf",
    "sf",
    "third_place",
    "final",
  ];

  const rows = data.map((row) => {
    const r = row as Record<string, unknown>;
    const matchRaw = r.match;
    const match = matchRaw
      ? normalizeMatch(matchRaw)
      : null;
    return {
      id: r.id as string,
      stage: r.stage as MatchStage,
      label: r.label as string,
      bracket_order: r.bracket_order as number,
      match_id: r.match_id as number | null,
      match,
    } as BracketSlotWithMatch;
  });

  return rows.sort(
    (a, b) =>
      stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage) ||
      a.bracket_order - b.bracket_order,
  );
}

export async function getOpenBracketSlots(
  stage: MatchStage,
): Promise<{ id: string; label: string }[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("bracket_slots")
    .select("id, label")
    .eq("stage", stage)
    .is("match_id", null)
    .order("bracket_order");

  return (data ?? []) as { id: string; label: string }[];
}
