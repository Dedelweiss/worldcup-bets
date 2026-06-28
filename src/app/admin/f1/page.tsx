import { F1MeetingAdminRow } from "@/components/admin/f1-meeting-admin-row";
import { F1SyncButton } from "@/components/admin/f1-sync-button";
import { getF1Meetings, isF1ModeEnabled } from "@/lib/f1/queries";
import { F1_SEASON_YEAR } from "@/lib/sport/constants";
import { F1ModeToggle } from "@/components/admin/f1-mode-toggle";

export const metadata = { title: "Admin · F1" };

export default async function AdminF1Page() {
  const [meetings, f1Enabled] = await Promise.all([
    getF1Meetings(F1_SEASON_YEAR),
    isF1ModeEnabled(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Administration F1</h1>
        <div className="flex flex-wrap items-center gap-2">
          <F1ModeToggle enabled={f1Enabled} />
          <F1SyncButton />
        </div>
      </div>

      <p className="text-sm text-zinc-400">
        Synchronisation OpenF1 (calendrier {F1_SEASON_YEAR}, pilotes, résultats).
        Règlement manuel si l&apos;API est en retard.
      </p>

      <div className="space-y-2">
        {meetings.map((meeting) => (
          <F1MeetingAdminRow key={meeting.meeting_key} meeting={meeting} />
        ))}
        {meetings.length === 0 && (
          <p className="text-sm text-zinc-500">
            Aucun GP en base — lancez une sync OpenF1.
          </p>
        )}
      </div>
    </div>
  );
}
