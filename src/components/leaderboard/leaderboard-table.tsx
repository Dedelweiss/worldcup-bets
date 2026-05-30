import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { LeaderboardEntry, LeaderboardSort } from "@/types/database";

interface LeaderboardTableProps {
  players: LeaderboardEntry[];
  highlightSort?: LeaderboardSort;
}

export function LeaderboardTable({
  players,
  highlightSort = "balance",
}: LeaderboardTableProps) {
  if (players.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Aucun joueur inscrit.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/40 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-medium">#</th>
            <th className="px-3 py-3 font-medium">Joueur</th>
            <th
              className={cn(
                "px-3 py-3 font-medium text-right",
                highlightSort === "balance" && "text-primary",
              )}
            >
              Bankroll
            </th>
            <th
              className={cn(
                "px-3 py-3 font-medium text-center",
                highlightSort === "classic_won" && "text-primary",
              )}
              colSpan={2}
            >
              Classiques
            </th>
            <th
              className={cn(
                "px-3 py-3 font-medium text-center",
                highlightSort === "fun_won" && "text-primary",
              )}
              colSpan={2}
            >
              Paris fun
            </th>
            <th className="px-3 py-3 font-medium text-center" colSpan={2}>
              Total
            </th>
          </tr>
          <tr className="border-t border-border/40 text-[10px]">
            <th colSpan={3} />
            <th className="px-2 py-1 text-center text-green-600 dark:text-green-400">
              G
            </th>
            <th className="px-2 py-1 text-center text-red-600 dark:text-red-400">
              P
            </th>
            <th className="px-2 py-1 text-center text-green-600 dark:text-green-400">
              G
            </th>
            <th className="px-2 py-1 text-center text-red-600 dark:text-red-400">
              P
            </th>
            <th className="px-2 py-1 text-center text-green-600 dark:text-green-400">
              G
            </th>
            <th className="px-2 py-1 text-center text-red-600 dark:text-red-400">
              P
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={player.id} className="border-t border-border/60">
              <td className="px-3 py-3 tabular-nums text-muted-foreground">
                {index + 1}
              </td>
              <td className="px-3 py-3 font-medium">
                {player.display_name ?? player.username ?? "Joueur"}
              </td>
              <td
                className={cn(
                  "px-3 py-3 text-right font-semibold tabular-nums",
                  highlightSort === "balance"
                    ? "text-primary text-base"
                    : "text-foreground",
                )}
              >
                {formatCurrency(player.balance)}
              </td>
              <td
                className={cn(
                  "px-2 py-3 text-center tabular-nums text-green-600 dark:text-green-400",
                  highlightSort === "classic_won" && "font-bold text-base",
                )}
              >
                {player.classic_won}
              </td>
              <td className="px-2 py-3 text-center tabular-nums text-red-600 dark:text-red-400">
                {player.classic_lost}
              </td>
              <td
                className={cn(
                  "px-2 py-3 text-center tabular-nums text-green-600 dark:text-green-400",
                  highlightSort === "fun_won" && "font-bold text-base",
                )}
              >
                {player.fun_won}
              </td>
              <td className="px-2 py-3 text-center tabular-nums text-red-600 dark:text-red-400">
                {player.fun_lost}
              </td>
              <td className="px-2 py-3 text-center tabular-nums font-medium text-green-600 dark:text-green-400">
                {player.total_won}
              </td>
              <td className="px-2 py-3 text-center tabular-nums font-medium text-red-600 dark:text-red-400">
                {player.total_lost}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
