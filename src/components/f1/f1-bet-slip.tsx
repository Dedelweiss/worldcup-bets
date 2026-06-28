"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { placeF1RaceWinnerBetAction } from "@/app/(app)/f1/actions";
import { pointsFromOdd } from "@/lib/f1/odds";
import type { F1Bet, F1Driver, F1Meeting } from "@/types/f1";
import { cn } from "@/lib/utils";

interface F1BetSlipProps {
  meeting: F1Meeting;
  drivers: F1Driver[];
  existingBet: F1Bet | null;
  boostsAvailable?: number;
}

export function F1BetSlip({
  meeting,
  drivers,
  existingBet,
  boostsAvailable = 0,
}: F1BetSlipProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const bettingOpen =
    meeting.status === "scheduled" &&
    meeting.race_start_at != null &&
    new Date(meeting.race_start_at) > new Date();

  function placeBet(driverNumber: number, odd: number, useBoost: boolean) {
    startTransition(async () => {
      try {
        await placeF1RaceWinnerBetAction({
          meetingKey: meeting.meeting_key,
          driverNumber,
          odd,
          useBoost,
        });
        toast.success("Pari enregistré !");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors du pari");
      }
    });
  }

  if (meeting.status === "finished") {
    return (
      <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <h2 className="font-heading text-lg font-semibold">Paris clôturés</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Ce Grand Prix est terminé
          {meeting.winner_driver_number != null &&
            ` — vainqueur #${meeting.winner_driver_number}`}
          .
        </p>
        {existingBet && (
          <p className="mt-2 text-sm text-lime-300">
            Votre pari : #
            {existingBet.driver_number} —{" "}
            {existingBet.status === "won"
              ? "Gagné"
              : existingBet.status === "lost"
                ? "Perdu"
                : existingBet.status}
          </p>
        )}
      </section>
    );
  }

  if (!bettingOpen) {
    return (
      <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <h2 className="font-heading text-lg font-semibold">Paris fermés</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Les paris sont clos au départ de la course.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <h2 className="font-heading text-lg font-semibold">Vainqueur du GP</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Choisissez le pilote qui remportera la course. Points = cote × 10.
      </p>

      <ul className="mt-4 space-y-2">
        {drivers.map((driver) => {
          const odd = driver.winner_odd ?? 8;
          const points = pointsFromOdd(odd);
          const selected =
            existingBet?.driver_number === driver.driver_number &&
            existingBet.status === "pending";

          return (
            <li key={driver.driver_number}>
              <button
                type="button"
                disabled={pending || odd <= 0}
                onClick={() => placeBet(driver.driver_number, odd, false)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "border-lime-400/50 bg-lime-400/10"
                    : "border-white/10 hover:border-lime-400/30 hover:bg-white/5",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor: driver.team_colour
                        ? `#${driver.team_colour}`
                        : "#71717a",
                    }}
                  />
                  <span className="font-medium">{driver.full_name}</span>
                  <span className="text-xs text-zinc-500">
                    {driver.team_name}
                  </span>
                </span>
                <span className="text-sm tabular-nums text-lime-300">
                  {odd.toFixed(2)} · {points} pts
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {existingBet?.status === "pending" && boostsAvailable > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
          <div>
            <p className="text-sm font-medium">Boost ×2</p>
            <p className="text-xs text-zinc-500">
              {boostsAvailable} restant{boostsAvailable > 1 ? "s" : ""}
            </p>
          </div>
          <Switch
            checked={existingBet.is_boosted}
            disabled={pending}
            onCheckedChange={(checked) => {
              const driver = drivers.find(
                (d) => d.driver_number === existingBet.driver_number,
              );
              if (!driver?.winner_odd || existingBet.driver_number == null) return;
              placeBet(
                existingBet.driver_number,
                driver.winner_odd,
                checked,
              );
            }}
          />
        </div>
      )}
    </section>
  );
}
