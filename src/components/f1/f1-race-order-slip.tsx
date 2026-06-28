"use client";

import { GripVertical, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { placeF1RaceOrderBetAction } from "@/app/(app)/f1/actions";
import { ShareF1GridButton } from "@/components/f1/share-f1-grid-button";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  F1_RACE_ORDER_MAX_POINTS,
  F1_RACE_ORDER_SIZE,
  RACE_ORDER_SCORING_LABELS,
  raceOrderFromSelection,
} from "@/lib/f1/race-order-scoring";
import type { F1Bet, F1Driver, F1Meeting } from "@/types/f1";
import { cn } from "@/lib/utils";

interface F1RaceOrderSlipProps {
  meeting: F1Meeting;
  drivers: F1Driver[];
  existingBet: F1Bet | null;
  boostsAvailable?: number;
}

export function F1RaceOrderSlip({
  meeting,
  drivers,
  existingBet,
  boostsAvailable = 0,
}: F1RaceOrderSlipProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const driverMap = useMemo(
    () => new Map(drivers.map((d) => [d.driver_number, d])),
    [drivers],
  );

  const savedOrder = useMemo(
    () =>
      existingBet?.selection
        ? raceOrderFromSelection(existingBet.selection)
        : null,
    [existingBet],
  );

  const [order, setOrder] = useState<number[]>(savedOrder ?? []);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [useBoost, setUseBoost] = useState(existingBet?.is_boosted ?? false);

  const selectedSet = useMemo(() => new Set(order), [order]);
  const poolDrivers = useMemo(
    () =>
      [...drivers].sort((a, b) =>
        (a.full_name ?? "").localeCompare(b.full_name ?? "", "fr"),
      ),
    [drivers],
  );

  const bettingOpen =
    meeting.status === "scheduled" &&
    meeting.race_start_at != null &&
    new Date(meeting.race_start_at) > new Date() &&
    drivers.length >= F1_RACE_ORDER_SIZE;

  const reorder = useCallback((from: number, to: number) => {
    if (from === to) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  function addDriver(driverNumber: number) {
    if (selectedSet.has(driverNumber)) return;
    if (order.length >= F1_RACE_ORDER_SIZE) {
      toast.message("Top 10 complet — retirez un pilote pour en ajouter un autre.");
      return;
    }
    setOrder((prev) => [...prev, driverNumber]);
  }

  function removeDriver(driverNumber: number) {
    setOrder((prev) => prev.filter((n) => n !== driverNumber));
  }

  function saveOrder() {
    if (order.length !== F1_RACE_ORDER_SIZE) {
      toast.error(`Sélectionnez ${F1_RACE_ORDER_SIZE} pilotes.`);
      return;
    }
    startTransition(async () => {
      try {
        await placeF1RaceOrderBetAction({
          meetingKey: meeting.meeting_key,
          order,
          useBoost,
        });
        toast.success("Top 10 enregistré !");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  if (meeting.status === "finished") {
    return (
      <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <h2 className="font-heading text-lg font-semibold">Top 10 — terminé</h2>
        {existingBet && savedOrder ? (
          <div className="mt-3 space-y-1">
            <p className="text-sm text-lime-300">
              {existingBet.status === "won"
                ? `${existingBet.potential_payout} pts gagnés`
                : existingBet.status === "lost"
                  ? "0 pt"
                  : "En attente"}
            </p>
            <ol className="mt-2 space-y-1 text-sm">
              {savedOrder.map((num, idx) => {
                const d = driverMap.get(num);
                return (
                  <li key={num} className="flex gap-2 text-zinc-300">
                    <span className="w-5 tabular-nums text-zinc-500">
                      {idx + 1}.
                    </span>
                    {d?.full_name ?? `#${num}`}
                  </li>
                );
              })}
            </ol>
            <div className="mt-3">
              <ShareF1GridButton
                meetingName={meeting.meeting_name}
                order={savedOrder}
                drivers={drivers}
              />
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-zinc-400">Aucun top 10 enregistré.</p>
        )}
      </section>
    );
  }

  if (!bettingOpen) {
    return (
      <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <h2 className="font-heading text-lg font-semibold">Top 10 ordonné</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {drivers.length < F1_RACE_ORDER_SIZE
            ? "Line-up incomplète — sync en cours."
            : "Paris clos au départ de la course."}
        </p>
      </section>
    );
  }

  const selectionComplete = order.length === F1_RACE_ORDER_SIZE;

  return (
    <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">Top 10 ordonné</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Choisissez 10 pilotes, puis classez-les par glisser-déposer. Max{" "}
          {F1_RACE_ORDER_MAX_POINTS} pts (+ bonus vainqueur P1).
        </p>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-300">Votre classement</h3>
          <span
            className={cn(
              "text-xs tabular-nums",
              selectionComplete ? "text-lime-400" : "text-zinc-500",
            )}
          >
            {order.length}/{F1_RACE_ORDER_SIZE}
          </span>
        </div>

        {order.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-sm text-zinc-500">
            Ajoutez des pilotes ci-dessous pour commencer.
          </p>
        ) : (
          <ul className="space-y-1.5" aria-label="Ordre prédit top 10">
            {order.map((driverNumber, index) => {
              const driver = driverMap.get(driverNumber);
              return (
                <li
                  key={driverNumber}
                  draggable={selectionComplete}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex != null) reorder(dragIndex, index);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2",
                    selectionComplete && "cursor-grab active:cursor-grabbing",
                    dragIndex === index && "opacity-50",
                    index === 0 && "border-lime-400/30 bg-lime-400/5",
                  )}
                >
                  {selectionComplete ? (
                    <GripVertical
                      className="size-4 shrink-0 text-zinc-500"
                      aria-hidden
                    />
                  ) : (
                    <span className="size-4 shrink-0" />
                  )}
                  <span className="w-6 text-sm font-semibold tabular-nums text-lime-400">
                    {index + 1}
                  </span>
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: driver?.team_colour
                        ? `#${driver.team_colour}`
                        : "#71717a",
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {driver?.full_name ?? `#${driverNumber}`}
                  </span>
                  <span className="hidden truncate text-xs text-zinc-500 sm:inline">
                    {driver?.team_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDriver(driverNumber)}
                    className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
                    aria-label={`Retirer ${driver?.full_name ?? driverNumber}`}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {!selectionComplete && order.length > 0 && (
          <p className="mt-2 text-xs text-zinc-500">
            Encore {F1_RACE_ORDER_SIZE - order.length} pilote
            {F1_RACE_ORDER_SIZE - order.length > 1 ? "s" : ""} à choisir — le
            drag-and-drop sera actif à 10/10.
          </p>
        )}
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-medium text-zinc-300">
          Pilotes disponibles
        </h3>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {poolDrivers.map((driver) => {
            const picked = selectedSet.has(driver.driver_number);
            return (
              <li key={driver.driver_number}>
                <button
                  type="button"
                  disabled={picked}
                  onClick={() => addDriver(driver.driver_number)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    picked
                      ? "cursor-default border-white/5 bg-zinc-900/40 opacity-40"
                      : "border-white/10 hover:border-lime-400/30 hover:bg-white/5",
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: driver.team_colour
                        ? `#${driver.team_colour}`
                        : "#71717a",
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {driver.full_name}
                  </span>
                  <span className="truncate text-xs text-zinc-500">
                    {driver.team_name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <details className="mt-4 text-xs text-zinc-500">
        <summary className="cursor-pointer hover:text-zinc-300">
          Barème de points
        </summary>
        <ul className="mt-2 space-y-0.5 pl-2">
          {RACE_ORDER_SCORING_LABELS.map((row) => (
            <li key={row.label}>
              {row.label} → {row.points} pt{row.points > 1 ? "s" : ""}
            </li>
          ))}
        </ul>
      </details>

      {boostsAvailable > 0 && selectionComplete && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
          <div>
            <p className="text-sm font-medium">Boost ×2</p>
            <p className="text-xs text-zinc-500">
              {boostsAvailable} restant{boostsAvailable > 1 ? "s" : ""}
            </p>
          </div>
          <Switch checked={useBoost} onCheckedChange={setUseBoost} />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          className="flex-1"
          disabled={pending || !selectionComplete}
          onClick={saveOrder}
        >
          {pending
            ? "Enregistrement…"
            : selectionComplete
              ? "Enregistrer mon top 10"
              : `Sélectionnez ${F1_RACE_ORDER_SIZE - order.length} pilote${
                  F1_RACE_ORDER_SIZE - order.length > 1 ? "s" : ""
                }`}
        </Button>
        {selectionComplete && (
          <ShareF1GridButton
            meetingName={meeting.meeting_name}
            order={order}
            drivers={drivers}
          />
        )}
      </div>
    </section>
  );
}
