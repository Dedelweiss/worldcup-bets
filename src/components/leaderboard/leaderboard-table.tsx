import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { LeaderboardEntry, LeaderboardSort } from "@/types/database";

interface LeaderboardTableProps {
  players: LeaderboardEntry[];
  highlightSort?: LeaderboardSort;
}

function sortLabel(sort: LeaderboardSort): string {
  if (sort === "classic_won") return "Paris matchs gagnés";
  if (sort === "fun_won") return "Paris fun gagnés";
  return "Bankroll";
}

function primaryValue(player: LeaderboardEntry, sort: LeaderboardSort): string {
  if (sort === "classic_won") return String(player.classic_won);
  if (sort === "fun_won") return String(player.fun_won);
  return formatCurrency(player.balance);
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
    <>
      {/* Mobile / tablette : cartes (pas de scroll horizontal) */}
      <ul className="space-y-3 md:hidden">
        {players.map((player, index) => (
          <li
            key={player.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  index === 0
                    ? "bg-primary text-primary-foreground"
                    : index === 1
                      ? "bg-primary/20 text-primary"
                      : index === 2
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">
                  {player.display_name ?? player.username ?? "Joueur"}
                </p>
                {player.leagues && player.leagues.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {player.leagues.map((league) => (
                      <Badge
                        key={league.id}
                        variant="outline"
                        className="max-w-[120px] truncate px-1.5 py-0 text-[10px] font-normal"
                        title={league.name}
                      >
                        {league.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {sortLabel(highlightSort)}
                </p>
                <p className="text-xl font-bold tabular-nums text-primary">
                  {primaryValue(player, highlightSort)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center text-xs">
              <StatCell
                label="Bankroll"
                value={formatCurrency(player.balance)}
                active={highlightSort === "balance"}
              />
              <StatCell
                label="1N2"
                value={`${player.classic_won}G · ${player.classic_lost}P`}
                active={highlightSort === "classic_won"}
              />
              <StatCell
                label="Fun"
                value={`${player.fun_won}G · ${player.fun_lost}P`}
                active={highlightSort === "fun_won"}
              />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop : tableau complet */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-sm">
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
                <td className="px-3 py-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium">
                      {player.display_name ?? player.username ?? "Joueur"}
                    </span>
                    {player.leagues && player.leagues.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {player.leagues.map((league) => (
                          <Badge
                            key={league.id}
                            variant="outline"
                            className="max-w-[140px] truncate px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                            title={league.name}
                          >
                            {league.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
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
    </>
  );
}

function StatCell({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-muted/30 px-1 py-1.5",
        active && "ring-1 ring-primary/40 bg-primary/10",
      )}
    >
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-medium tabular-nums",
          active ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
