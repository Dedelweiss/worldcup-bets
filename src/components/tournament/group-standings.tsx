"use client";

import { useState } from "react";
import { TeamFlag } from "@/components/shared/team-flag";
import { cn } from "@/lib/utils";
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
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <GroupStandingsCard
              key={groupStanding.group.id}
              data={groupStanding}
            />
          ))}
        </div>
      ) : (
        <GroupStandingsCard data={active} />
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
        "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function GroupStandingsCard({
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
        "overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      <header className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <h3 className="font-semibold">{group.name}</h3>
        <p className="text-[10px] text-muted-foreground">
          3 pts victoire · 1 pt nul
        </p>
      </header>

      <ul className="divide-y divide-border/60">
        {rows.map((row, index) => (
          <li
            key={row.team.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5",
              index === 0 && row.points > 0 && "bg-primary/5",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                index === 0 ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {index + 1}
            </span>
            <TeamFlag
              name={row.team.name}
              code={row.team.code}
              logoUrl={row.team.logo_url}
              size={28}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.team.name}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {row.played} j · {row.won}V {row.drawn}N {row.lost}D ·{" "}
                {row.goalsFor}:{row.goalsAgainst}
                {row.goalDiff > 0 ? ` (+${row.goalDiff})` : row.goalDiff < 0 ? ` (${row.goalDiff})` : ""}
              </p>
            </div>
            <span className="shrink-0 text-lg font-bold tabular-nums text-primary">
              {row.points}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
