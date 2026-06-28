"use client";

import { useState } from "react";
import type {
  JolpicaConstructorStanding,
  JolpicaDriverStanding,
} from "@/lib/f1/jolpica-client";
import { teamColorHex } from "@/lib/f1/team-colors";
import { cn } from "@/lib/utils";

interface F1StandingsTabsProps {
  drivers: JolpicaDriverStanding[];
  constructors: JolpicaConstructorStanding[];
  season: number;
  round: number | null;
}

export function F1StandingsTabs({
  drivers,
  constructors,
  season,
  round,
}: F1StandingsTabsProps) {
  const [tab, setTab] = useState<"drivers" | "constructors">("drivers");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-white/10 bg-zinc-900/80 p-0.5">
          {(["drivers", "constructors"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize",
                tab === t
                  ? "bg-lime-400/20 text-lime-300"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {t === "drivers" ? "Pilotes" : "Constructeurs"}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          {season}
          {round != null ? ` · après GP ${round}` : ""}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-zinc-900/80 text-left text-xs text-zinc-500">
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2 text-right">Pts</th>
              <th className="hidden px-3 py-2 text-right sm:table-cell">V</th>
            </tr>
          </thead>
          <tbody>
            {tab === "drivers"
              ? drivers.map((d) => (
                  <tr
                    key={d.driverId}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2.5 tabular-nums font-semibold text-zinc-400">
                      {d.position}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor: `#${teamColorHex(d.constructorName)}`,
                          }}
                        />
                        <span>
                          {d.givenName}{" "}
                          <span className="font-semibold uppercase">
                            {d.familyName}
                          </span>
                        </span>
                        {d.code && (
                          <span className="text-xs text-zinc-500">{d.code}</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500 sm:hidden">
                        {d.constructorName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                      {d.points}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-zinc-400 sm:table-cell">
                      {d.wins}
                    </td>
                  </tr>
                ))
              : constructors.map((c) => (
                  <tr
                    key={c.constructorId}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2.5 tabular-nums font-semibold text-zinc-400">
                      {c.position}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor: `#${teamColorHex(c.name)}`,
                          }}
                        />
                        {c.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                      {c.points}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-zinc-400 sm:table-cell">
                      {c.wins}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-600">
        Données championnat via Jolpica F1 (successeur Ergast) · cache 1 h
      </p>
    </div>
  );
}
