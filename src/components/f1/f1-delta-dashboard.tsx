import {
  scoreRaceOrderBreakdown,
  raceOrderFromSelection,
} from "@/lib/f1/race-order-scoring";
import type { F1Bet, F1Driver, F1Meeting } from "@/types/f1";
import { cn } from "@/lib/utils";

interface F1DeltaDashboardProps {
  meeting: F1Meeting;
  drivers: F1Driver[];
  bet: F1Bet | null;
}

export function F1DeltaDashboard({
  meeting,
  drivers,
  bet,
}: F1DeltaDashboardProps) {
  if (meeting.status !== "finished" || !meeting.race_results?.length || !bet) {
    return null;
  }

  const order = raceOrderFromSelection(bet.selection);
  if (!order) return null;

  const names = new Map(drivers.map((d) => [d.driver_number, d.full_name]));
  const breakdown = scoreRaceOrderBreakdown(
    order,
    meeting.race_results,
    names,
  );

  return (
    <section className="rounded-xl border border-lime-400/20 bg-gradient-to-br from-lime-400/5 to-zinc-950 p-4">
      <h2 className="font-heading text-lg font-semibold">Debrief — votre score</h2>
      <p className="mt-1 text-2xl font-bold tabular-nums text-lime-300">
        {breakdown.total} pts
        {bet.is_boosted && (
          <span className="ml-2 text-sm font-normal text-zinc-400">
            (×2 boost appliqué au règlement)
          </span>
        )}
      </p>

      {breakdown.winnerBonus > 0 && (
        <p className="mt-1 text-sm text-lime-400">
          +{breakdown.winnerBonus} bonus vainqueur P1 exact
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500">
              <th className="pb-2 pr-2">Pilote</th>
              <th className="pb-2 pr-2 text-center">Prédit</th>
              <th className="pb-2 pr-2 text-center">Réel</th>
              <th className="pb-2 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.rows.map((row) => (
              <tr
                key={row.driverNumber}
                className="border-t border-white/5"
              >
                <td className="py-2 pr-2">{row.driverName}</td>
                <td className="py-2 pr-2 text-center tabular-nums">
                  P{row.predicted}
                </td>
                <td className="py-2 pr-2 text-center tabular-nums">
                  P{row.actual}
                </td>
                <td
                  className={cn(
                    "py-2 text-right tabular-nums font-medium",
                    row.points >= 6
                      ? "text-lime-300"
                      : row.points > 0
                        ? "text-zinc-300"
                        : "text-zinc-600",
                  )}
                >
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
