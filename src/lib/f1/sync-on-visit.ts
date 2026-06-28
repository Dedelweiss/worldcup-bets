import { createAdminClient } from "@/lib/supabase/admin";
import { syncF1Season } from "@/lib/f1/sync-season";
import { F1_SEASON_YEAR } from "@/lib/sport/constants";

const SYNC_COOLDOWN_MS = 15 * 60 * 1000;

let lastSyncAt = 0;

export async function syncF1SeasonIfNeeded(): Promise<void> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("f1_meetings")
    .select("*", { count: "exact", head: true })
    .eq("year", F1_SEASON_YEAR);

  const stale = Date.now() - lastSyncAt > SYNC_COOLDOWN_MS;
  if ((count ?? 0) === 0 || stale) {
    lastSyncAt = Date.now();
    await syncF1Season(F1_SEASON_YEAR).catch(() => undefined);
  }
}

export async function syncF1MeetingIfNeeded(meetingKey: number): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("f1_meetings")
    .select("updated_at, status")
    .eq("meeting_key", meetingKey)
    .maybeSingle();

  const needsSync =
    !data ||
    data.status === "live" ||
    Date.now() - new Date(data.updated_at).getTime() > SYNC_COOLDOWN_MS;

  if (needsSync) {
    await syncF1Season(F1_SEASON_YEAR).catch(() => undefined);
  }
}
