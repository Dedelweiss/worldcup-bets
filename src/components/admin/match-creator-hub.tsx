"use client";

import { useState } from "react";
import { GroupMatchCreator } from "@/components/admin/group-match-creator";
import { KnockoutMatchCreator } from "@/components/admin/knockout-match-creator";
import { cn } from "@/lib/utils";
import type { TournamentGroup, TournamentTeam } from "@/types/database";

type Tab = "group" | "knockout";

interface MatchCreatorHubProps {
  groups: TournamentGroup[];
  teamsByGroup: Record<number, TournamentTeam[]>;
  allTeams: TournamentTeam[];
  openSlotsByStage: Record<string, { id: string; label: string }[]>;
}

export function MatchCreatorHub({
  groups,
  teamsByGroup,
  allTeams,
  openSlotsByStage,
}: MatchCreatorHubProps) {
  const [tab, setTab] = useState<Tab>("group");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 rounded-lg border border-border p-1">
        {(
          [
            ["group", "Poules"],
            ["knockout", "Phase finale"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "group" ? (
        <GroupMatchCreator groups={groups} teamsByGroup={teamsByGroup} />
      ) : (
        <KnockoutMatchCreator
          allTeams={allTeams}
          openSlotsByStage={openSlotsByStage}
        />
      )}
    </div>
  );
}
