import { createClient } from "@/lib/supabase/server";
import { normalizeMatch } from "@/lib/matches";

export interface LiveBetSnapshotItem {
  matchId: number;
  matchStatus: string;
  label: string;
  kickoffAt: string | null;
}

export interface LiveBetsSnapshot {
  livePendingCount: number;
  items: LiveBetSnapshotItem[];
}

export async function getLiveBetsSnapshot(
  userId: string,
): Promise<LiveBetsSnapshot> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bets")
    .select(
      `
      match_id,
      match:matches (
        id, status, kickoff_at,
        home_team:teams!matches_home_team_id_fkey (name),
        away_team:teams!matches_away_team_id_fkey (name)
      )
    `,
    )
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error || !data) {
    return { livePendingCount: 0, items: [] };
  }

  const items: LiveBetSnapshotItem[] = [];

  for (const row of data) {
    const matchRaw = row.match;
    const match = Array.isArray(matchRaw) ? matchRaw[0] : matchRaw;
    if (!match) continue;

    const normalized = normalizeMatch(match);
    const home = normalized.home_team?.name ?? "Domicile";
    const away = normalized.away_team?.name ?? "Extérieur";

    items.push({
      matchId: row.match_id as number,
      matchStatus: normalized.status,
      label: `${home} vs ${away}`,
      kickoffAt: normalized.kickoff_at,
    });
  }

  const livePendingCount = items.filter((i) => i.matchStatus === "live").length;

  return { livePendingCount, items };
}
