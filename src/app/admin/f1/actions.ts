"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-server";
import { syncF1Season } from "@/lib/f1/sync-season";
import { createAdminClient } from "@/lib/supabase/admin";
import { F1_SEASON_YEAR } from "@/lib/sport/constants";

export async function adminSyncF1Action(): Promise<{
  meetingsUpserted: number;
  driversUpserted: number;
  settled: number;
  errors: string[];
}> {
  await requireAdmin();
  const result = await syncF1Season(F1_SEASON_YEAR);
  revalidatePath("/f1");
  revalidatePath("/admin/f1");
  return result;
}

export async function adminSettleF1MeetingAction(
  meetingKey: number,
  winnerDriverNumber: number,
): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.rpc("settle_f1_meeting", {
    p_meeting_key: meetingKey,
    p_winner_driver_number: winnerDriverNumber,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/f1/${meetingKey}`);
  revalidatePath("/f1/leaderboard");
  revalidatePath("/admin/f1");
}

export async function adminToggleF1ModeAction(enabled: boolean): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("tournament_config")
    .update({ f1_mode_enabled: enabled })
    .eq("id", 1);

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function adminUpdateF1MeetingStatusAction(
  meetingKey: number,
  status: "scheduled" | "live" | "finished" | "cancelled",
  winnerDriverNumber?: number | null,
): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("f1_meetings")
    .update({
      status,
      winner_driver_number: winnerDriverNumber ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("meeting_key", meetingKey);

  if (error) throw new Error(error.message);
  revalidatePath(`/f1/${meetingKey}`);
  revalidatePath("/admin/f1");
}
