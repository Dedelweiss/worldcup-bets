"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminSettleF1MeetingAction,
  adminUpdateF1MeetingStatusAction,
} from "@/app/admin/f1/actions";
import type { F1Meeting } from "@/types/f1";

export function F1MeetingAdminRow({ meeting }: { meeting: F1Meeting }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{meeting.meeting_name}</p>
        <p className="text-xs text-zinc-500">
          #{meeting.meeting_key} · {meeting.status}
          {meeting.winner_driver_number != null &&
            ` · Vainqueur #${meeting.winner_driver_number}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const winner = Number(fd.get("winner"));
            if (Number.isNaN(winner)) {
              toast.error("Numéro pilote invalide");
              return;
            }
            startTransition(async () => {
              try {
                await adminSettleF1MeetingAction(meeting.meeting_key, winner);
                toast.success("GP réglé");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            });
          }}
        >
          <Input
            name="winner"
            type="number"
            min={1}
            max={99}
            placeholder="N° pilote"
            className="h-8 w-24"
            defaultValue={meeting.winner_driver_number ?? undefined}
          />
          <Button type="submit" size="sm" disabled={pending}>
            Régler
          </Button>
        </form>
        {meeting.status !== "live" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await adminUpdateF1MeetingStatusAction(
                    meeting.meeting_key,
                    "live",
                  );
                  toast.success("Statut → live");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erreur");
                }
              });
            }}
          >
            Forcer live
          </Button>
        )}
      </div>
    </div>
  );
}
