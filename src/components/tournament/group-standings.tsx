"use client";

import { useState } from "react";
import { NavLink } from "@/components/layout/nav-link";
import { TeamFlag } from "@/components/shared/team-flag";
import { cn } from "@/lib/utils";
import { isTbdTeam } from "@/lib/tournament/tbd-team";
import type { GroupStandings } from "@/lib/tournament/standings";

type GroupFilter = "all" | number;

interface GroupStandingsViewProps {
  standings: GroupStandings[];
}

export function GroupStandingsView({ standings }: GroupStandingsViewProps) {
  const withTeams = standings.filter((s) => s.rows.length > 0);
  const [filter, setFilter] = useState<GroupFilter>("all");

  if (withTeams.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Aucune équipe en poules pour le moment. L&apos;admin peut les configurer
        dans Équipes & groupes.
      </p>
    );
  }

  const active =
    filter === "all"
      ? withTeams[0]
      : (withTeams.find((s) => s.group.id === filter) ?? withTeams[0]);

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterPill
          active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          Toutes
        </FilterPill>
        {withTeams.map(({ group }) => (
          <FilterPill
            key={group.id}
            active={filter === group.id}
            onClick={() => setFilter(group.id)}
          >
            {group.name}
          </FilterPill>
        ))}
      </div>

      {filter === "all" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {withTeams.map((groupStanding) => (
            <GroupStandingsTable
              key={groupStanding.group.id}
              data={groupStanding}
            />
          ))}
        </div>
      ) : (
        <GroupStandingsTable data={active} />
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function GroupStandingsTable({
  data,
  className,
}: {
  data: GroupStandings;
  className?: string;
}) {
  const { group, rows } = data;

  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      <header className="border-b border-border/60 bg-muted/30 px-3 py-2 sm:px-4">
        <h3 className="font-semibold">{group.name}</h3>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="px-2 py-2 text-left font-medium">Équipe</th>
              <th className="w-9 px-1 py-2 text-center font-medium" title="Joués">
                P
              </th>
              <th className="w-9 px-1 py-2 text-center font-medium" title="Victoires">
                V
              </th>
              <th className="w-9 px-1 py-2 text-center font-medium" title="Nuls">
                N
              </th>
              <th className="w-9 px-1 py-2 text-center font-medium" title="Défaites">
                D
              </th>
              <th className="w-10 px-1 py-2 text-center font-medium" title="Différence de buts">
                GD
              </th>
              <th className="w-10 px-2 py-2 text-center font-medium" title="Points">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.team.id}
                className={cn(
                  "border-b border-border/40 last:border-0",
                  index === 0 && row.points > 0 && "bg-primary/5",
                )}
              >
                <td className="px-2 py-2 text-center text-xs font-medium text-muted-foreground tabular-nums">
                  {index + 1}
                </td>
                <td className="px-2 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamFlag
                      name={row.team.name}
                      code={row.team.code}
                      logoUrl={row.team.logo_url}
                      size={22}
                    />
                    {isTbdTeam(row.team) ? (
                      <span className="truncate font-medium">{row.team.name}</span>
                    ) : (
                      <NavLink
                        href={`/teams/${row.team.id}`}
                        className="truncate font-medium transition-colors hover:text-primary"
                      >
                        {row.team.name}
                      </NavLink>
                    )}
                  </div>
                </td>
                <td className="px-1 py-2 text-center tabular-nums text-muted-foreground">
                  {row.played}
                </td>
                <td className="px-1 py-2 text-center tabular-nums">{row.won}</td>
                <td className="px-1 py-2 text-center tabular-nums">{row.drawn}</td>
                <td className="px-1 py-2 text-center tabular-nums">{row.lost}</td>
                <td
                  className={cn(
                    "px-1 py-2 text-center tabular-nums font-medium",
                    row.goalDiff > 0 && "text-green-600 dark:text-green-400",
                    row.goalDiff < 0 && "text-red-600 dark:text-red-400",
                  )}
                >
                  {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                </td>
                <td className="px-2 py-2 text-center text-base font-bold tabular-nums text-primary">
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
