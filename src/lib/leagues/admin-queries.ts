import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { League, LeagueWithMemberCount } from "@/types/database";

const LEAGUE_SELECT =
  "id, name, slug, invite_code, created_by, created_at" as const;

function adminDb() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/** Lectures admin : contourne les soucis RLS sur /admin/leagues */
export async function getLeagueByIdForAdmin(
  leagueId: string,
): Promise<League | null> {
  const admin = adminDb();
  const supabase = admin ?? (await createClient());

  const { data, error } = await supabase
    .from("leagues")
    .select(LEAGUE_SELECT)
    .eq("id", leagueId)
    .maybeSingle();

  if (error) {
    console.error("getLeagueByIdForAdmin", error);
    return null;
  }
  return data as League | null;
}

export async function getAllLeaguesForAdmin(): Promise<LeagueWithMemberCount[]> {
  const admin = adminDb();
  const supabase = admin ?? (await createClient());

  const { data: leagues, error } = await supabase
    .from("leagues")
    .select(LEAGUE_SELECT)
    .order("created_at", { ascending: false });

  if (error || !leagues?.length) return [];

  const { data: counts } = await supabase.from("league_members").select("league_id");

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

export async function getLeagueMemberIdsForAdmin(
  leagueId: string,
): Promise<string[]> {
  const admin = adminDb();
  const supabase = admin ?? (await createClient());

  const { data } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId);

  return (data ?? []).map((r) => r.user_id);
}
