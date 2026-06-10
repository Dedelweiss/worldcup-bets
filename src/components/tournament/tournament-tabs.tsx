"use client";

import { useState } from "react";
import { BracketView } from "@/components/bracket/bracket-view";
import { GroupStandingsView } from "@/components/tournament/group-standings";
import { cn } from "@/lib/utils";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";
import type { BracketSlotWithMatch } from "@/types/database";
import type { GroupStandings } from "@/lib/tournament/standings";

type Tab = "groups" | "knockout";

interface TournamentTabsProps {
  standings: GroupStandings[];
  slots: BracketSlotWithMatch[];
  betStatuses?: Record<number, UserMatchBetStatus>;
  isAdmin?: boolean;
}

export function TournamentTabs({
  standings,
  slots,
  betStatuses = {},
  isAdmin,
}: TournamentTabsProps) {
  const [tab, setTab] = useState<Tab>("groups");

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 gap-2 rounded-lg border border-border p-1">
        {(
          [
            ["groups", "Classement poules"],
            ["knockout", "Phase finale"],
          ] as const
        ).map(([id, label]) => (
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
      ) : (
        <BracketView
          slots={slots}
          betStatuses={betStatuses}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
