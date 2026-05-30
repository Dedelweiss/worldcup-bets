import { createClient } from "@/lib/supabase/server";
import type { League, LeagueWithMemberCount } from "@/types/database";

export async function getLeaguesForUser(userId: string): Promise<League[]> {
  const supabase = await createClient();

  const { data: memberRows } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("user_id", userId);

  const memberIds = (memberRows ?? []).map((r) => r.league_id);

  const { data: owned } = await supabase
    .from("leagues")
    .select("id, name, slug, invite_code, created_by, created_at")
    .eq("created_by", userId);

  const ids = new Set<string>([
    ...memberIds,
    ...(owned ?? []).map((l) => l.id),
  ]);

  if (ids.size === 0) return [];

  const { data, error } = await supabase
    .from("leagues")
    .select("id, name, slug, invite_code, created_by, created_at")
    .in("id", Array.from(ids))
    .order("name");

  if (error) return [];
  return data as League[];
}

export async function getAllLeaguesAdmin(): Promise<LeagueWithMemberCount[]> {
  const supabase = await createClient();

  const { data: leagues, error } = await supabase
    .from("leagues")
    .select("id, name, slug, invite_code, created_by, created_at")
    .order("created_at", { ascending: false });

  if (error || !leagues?.length) return [];

  const { data: counts } = await supabase
    .from("league_members")
    .select("league_id");

  const countByLeague = new Map<string, number>();
  for (const row of counts ?? []) {
    countByLeague.set(
      row.league_id,
      (countByLeague.get(row.league_id) ?? 0) + 1,
    );
  }

  return leagues.map((l) => ({
    ...(l as League),
    member_count: countByLeague.get(l.id) ?? 0,
  }));
}

export async function getLeagueMemberIds(leagueId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId);

  return (data ?? []).map((r) => r.user_id);
}

export async function getLeagueById(leagueId: string): Promise<League | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leagues")
    .select("id, name, slug, invite_code, created_by, created_at")
    .eq("id", leagueId)
    .single();

  if (error || !data) return null;
  return data as League;
}
