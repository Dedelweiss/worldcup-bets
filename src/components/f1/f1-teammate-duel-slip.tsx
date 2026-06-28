"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { placeF1TeammateDuelAction } from "@/app/(app)/f1/actions";
import { pointsFromOdd } from "@/lib/f1/odds";
import type { F1TeammateDuel } from "@/lib/f1/teammate-pairs";
import type { F1Bet, F1Meeting } from "@/types/f1";
import { cn } from "@/lib/utils";

const DUEL_ODD = 1.9;

interface F1TeammateDuelSlipProps {
  meeting: F1Meeting;
  duels: F1TeammateDuel[];
  existingBet: F1Bet | null;
}

export function F1TeammateDuelSlip({
  meeting,
  duels,
  existingBet,
}: F1TeammateDuelSlipProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const open =
    meeting.status === "scheduled" &&
    meeting.race_start_at != null &&
    new Date(meeting.race_start_at) > new Date();

  const pts = pointsFromOdd(DUEL_ODD);
  const picked =
    existingBet?.driver_number ??
    (existingBet?.selection as { driver_number?: number } | null)?.driver_number;

  function pick(driverNumber: number, teammateNumber: number) {
    startTransition(async () => {
      try {
        await placeF1TeammateDuelAction({
          meetingKey: meeting.meeting_key,
          driverNumber,
          teammateNumber,
          odd: DUEL_ODD,
        });
        toast.success("Duel enregistré !");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  if (!open && !existingBet) return null;

  if (!open && existingBet) {
    return (
      <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <h2 className="font-heading text-lg font-semibold">Duel coéquipiers</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Pari #{picked} — {existingBet.status}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <h2 className="font-heading text-lg font-semibold">Duel coéquipiers</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Qui finit devant son coéquipier en course ? · {pts} pts
      </p>
      <ul className="mt-3 space-y-3">
        {duels.map((duel) => (
          <li
            key={duel.teamName}
            className="rounded-lg border border-white/10 p-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {duel.teamName}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[duel.driverA, duel.driverB].map((d) => {
                const other =
                  d.driver_number === duel.driverA.driver_number
                    ? duel.driverB
                    : duel.driverA;
                const selected = picked === d.driver_number;
                return (
                  <button
                    key={d.driver_number}
                    type="button"
                    disabled={pending}
                    onClick={() => pick(d.driver_number, other.driver_number)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-left text-sm",
                      selected
                        ? "border-lime-400/50 bg-lime-400/10"
                        : "border-white/10 hover:border-lime-400/30",
                    )}
                  >
                    {d.full_name}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
