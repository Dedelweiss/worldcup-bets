"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { placeF1PoleBetAction } from "@/app/(app)/f1/actions";
import { pointsFromOdd } from "@/lib/f1/odds";
import type { F1Bet, F1Driver, F1Meeting } from "@/types/f1";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const POLE_ODD = 6;

interface F1PoleBetSlipProps {
  meeting: F1Meeting;
  drivers: F1Driver[];
  existingBet: F1Bet | null;
}

export function F1PoleBetSlip({
  meeting,
  drivers,
  existingBet,
}: F1PoleBetSlipProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const qualiOpen =
    meeting.status === "scheduled" &&
    meeting.quali_start_at != null &&
    new Date(meeting.quali_start_at) > new Date();

  if (meeting.pole_driver_number != null && !qualiOpen) {
    return (
      <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <h2 className="font-heading text-lg font-semibold">Pole position</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Qualifs terminées — pole #{meeting.pole_driver_number}
          {existingBet && (
            <span className="block text-lime-300">
              Votre pari : #{existingBet.driver_number} —{" "}
              {existingBet.status === "won" ? "Gagné" : existingBet.status}
            </span>
          )}
        </p>
      </section>
    );
  }

  if (!qualiOpen) return null;

  function pick(driverNumber: number) {
    startTransition(async () => {
      try {
        await placeF1PoleBetAction({
          meetingKey: meeting.meeting_key,
          driverNumber,
          odd: POLE_ODD,
        });
        toast.success("Pole enregistrée !");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  const pts = pointsFromOdd(POLE_ODD);

  return (
    <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <h2 className="font-heading text-lg font-semibold">Pole position</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Qui prend la pole ? Clôture au début des qualifs · {pts} pts max
      </p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {drivers.map((d) => {
          const selected =
            existingBet?.driver_number === d.driver_number &&
            existingBet.status === "pending";
          return (
            <li key={d.driver_number}>
              <button
                type="button"
                disabled={pending}
                onClick={() => pick(d.driver_number)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm",
                  selected
                    ? "border-lime-400/50 bg-lime-400/10"
                    : "border-white/10 hover:border-lime-400/30",
                )}
              >
                <span
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor: d.team_colour
                      ? `#${d.team_colour}`
                      : "#71717a",
                  }}
                />
                <span className="truncate font-medium">{d.full_name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
