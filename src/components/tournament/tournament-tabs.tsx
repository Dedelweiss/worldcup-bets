"use client";

import { useState } from "react";
import { BracketView } from "@/components/bracket/bracket-view";
import { GroupStandingsView } from "@/components/tournament/group-standings";
import { TournamentStatsView } from "@/components/tournament/tournament-stats-view";
import { cn } from "@/lib/utils";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import type { TournamentStatsPageData } from "@/lib/tournament/tournament-stats-data";
import type { BracketSlotDisplay } from "@/lib/tournament/bracket-projection";
import type { BracketProjectionMeta } from "@/lib/tournament/bracket-projection";
import type { GroupStandings } from "@/lib/tournament/standings";

type Tab = "groups" | "knockout" | "stats";

interface TournamentTabsProps {
  standings: GroupStandings[];
  slots: BracketSlotDisplay[];
  betStatuses?: Record<number, UserMatchBetStatus>;
  isAdmin?: boolean;
  stats?: TournamentStatsPageData | null;
  projectionMeta?: BracketProjectionMeta;
}

export function TournamentTabs({
  standings,
  slots,
  betStatuses = {},
  isAdmin,
  stats,
  projectionMeta,
}: TournamentTabsProps) {
  const [tab, setTab] = useState<Tab>("groups");

  const tabs: [Tab, string][] = [
    ["groups", "Classement poules"],
    ["knockout", "Phase finale"],
    ["stats", "Statistiques"],
  ];

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 gap-2 rounded-lg border border-border p-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "groups" ? (
        <GroupStandingsView standings={standings} />
      ) : tab === "knockout" ? (
        <BracketView
          slots={slots}
          betStatuses={betStatuses}
          isAdmin={isAdmin}
          projectionMeta={projectionMeta}
        />
      ) : stats ? (
        <TournamentStatsView data={stats} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Statistiques indisponibles pour le moment.
        </p>
      )}
    </div>
  );
}
