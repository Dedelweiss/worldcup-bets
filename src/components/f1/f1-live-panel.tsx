"use client";

import { useEffect, useState } from "react";
import type { F1LiveSnapshot } from "@/types/f1";
import { cn } from "@/lib/utils";

interface F1LivePanelProps {
  meetingKey: number;
  sessionKey: number;
  circuitImage?: string | null;
  initialSnapshot: F1LiveSnapshot | null;
}

export function F1LivePanel({
  meetingKey,
  sessionKey,
  circuitImage,
  initialSnapshot,
}: F1LivePanelProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/f1/live?meetingKey=${meetingKey}&sessionKey=${sessionKey}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as F1LiveSnapshot;
        if (!cancelled) setSnapshot(data);
      } catch {
        // ignore
      }
    }

    poll();
    const id = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [meetingKey, sessionKey]);

  if (!snapshot) {
    return (
      <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <p className="text-sm text-zinc-400">Données live indisponibles.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-lime-300">{snapshot.flagLabel}</p>
          {snapshot.weather && (
            <p className="text-xs text-zinc-400">
              Piste {snapshot.weather.trackTemperature ?? "—"}°C · Air{" "}
              {snapshot.weather.airTemperature ?? "—"}°C
              {snapshot.weather.rainfall != null &&
              snapshot.weather.rainfall > 0
                ? " · Pluie"
                : ""}
            </p>
          )}
        </div>
        {snapshot.raceControlMessage && (
          <p className="mt-2 text-sm text-zinc-300">
            {snapshot.raceControlMessage}
          </p>
        )}
      </div>

      {circuitImage && (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/80 p-4">
          <img
            src={circuitImage}
            alt="Circuit"
            className="mx-auto max-h-40 w-full object-contain opacity-90"
          />
          <p className="mt-2 text-center text-xs text-zinc-500">
            Positions live (OpenF1)
          </p>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-zinc-900/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-zinc-400">
              <th className="px-3 py-2 font-medium">Pos</th>
              <th className="px-3 py-2 font-medium">Pilote</th>
              <th className="px-3 py-2 font-medium">Écurie</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.standings.map((row) => (
              <tr
                key={row.driver_number}
                className={cn(
                  "border-b border-white/5",
                  row.position <= 3 && "bg-lime-400/5",
                )}
              >
                <td className="px-3 py-2 tabular-nums font-semibold">
                  {row.position}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor: row.team_colour
                          ? `#${row.team_colour}`
                          : "#71717a",
                      }}
                    />
                    {row.driver_name}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-400">{row.team_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
