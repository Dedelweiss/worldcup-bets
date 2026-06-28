"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MatchCard } from "@/components/dashboard/match-card";
import { MatchesCalendarView } from "@/components/matches/matches-calendar-view";
import {
  MatchesFilterBar,
  type MatchesLayoutMode,
} from "@/components/matches/matches-filter-bar";
import type { MatchBetFilter } from "@/components/matches/matches-filter-bar";
import {
  sortMatchesByUserPriority,
  type UserMatchBetStatus,
} from "@/lib/bets/user-match-status";
import { STAGE_LABELS } from "@/lib/tournament/constants";
import type { MatchWithTeams, TournamentGroup } from "@/types/database";

export type { MatchBetFilter };

const LAYOUT_STORAGE_KEY = "wc2026-matches-layout";

function readStoredLayout(): MatchesLayoutMode {
  if (typeof window === "undefined") return "list";
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
  return stored === "calendar" || stored === "list" ? stored : "list";
}

interface MatchesExplorerProps {
  matches: MatchWithTeams[];
  groups: TournamentGroup[];
  initialFilter: "group" | "knockout";
  initialGroupId?: number;
  initialBetFilter?: MatchBetFilter;
  betStatuses?: Record<number, UserMatchBetStatus>;
}

export function MatchesExplorer({
  matches,
  groups,
  initialFilter,
  initialGroupId,
  initialBetFilter = "all",
  betStatuses = {},
}: MatchesExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [layout, setLayout] = useState<MatchesLayoutMode>("list");

  useEffect(() => {
    setLayout(readStoredLayout());
  }, []);

  const setLayoutPersist = (next: MatchesLayoutMode) => {
    setLayout(next);
    localStorage.setItem(LAYOUT_STORAGE_KEY, next);
  };

  const viewParam = searchParams.get("view");
  const filter =
    viewParam === "knockout"
      ? "knockout"
      : viewParam === "group"
        ? "group"
        : initialFilter;
  const groupId = searchParams.get("group")
    ? Number(searchParams.get("group"))
    : initialGroupId;
  const betsParam = searchParams.get("bets");
  const betFilter =
    betsParam === "my"
      ? "my-bets"
      : betsParam === "fun"
        ? "fun-pending"
        : betsParam === null
          ? initialBetFilter
          : "all";

  function setView(view: "group" | "knockout") {
    const p = new URLSearchParams(searchParams.toString());
    p.set("view", view);
    if (view === "knockout") p.delete("group");
    router.push(`/matches?${p.toString()}`);
  }

  function setGroup(id: number | null) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("view", "group");
    if (id != null) p.set("group", String(id));
    else p.delete("group");
    router.push(`/matches?${p.toString()}`);
  }

  function setBetFilter(next: MatchBetFilter) {
    const p = new URLSearchParams(searchParams.toString());
    if (next === "all") p.delete("bets");
    else if (next === "my-bets") p.set("bets", "my");
    else p.set("bets", "fun");
    router.push(`/matches?${p.toString()}`);
  }

  const filtered =
    filter === "knockout"
      ? matches.filter((m) => m.stage && m.stage !== "group")
      : matches.filter((m) => !m.stage || m.stage === "group");

  const byGroup =
    filter === "group" && groupId
      ? filtered.filter((m) => m.tournament_group_id === groupId)
      : filtered;

  const byBetFilter = byGroup.filter((m) => {
    const s = betStatuses[m.id];
    if (betFilter === "my-bets") return s?.hasClassicBet;
    if (betFilter === "fun-pending") {
      return s?.hasClassicBet && (s.pendingFunToPlay ?? 0) > 0;
    }
    return true;
  });

  const displayMatches = sortMatchesByUserPriority(byBetFilter, betStatuses);

  const myBetsCount = byGroup.filter((m) => betStatuses[m.id]?.hasClassicBet).length;
  const funPendingCount = byGroup.filter((m) => {
    const s = betStatuses[m.id];
    return s?.hasClassicBet && (s.pendingFunToPlay ?? 0) > 0;
  }).length;

  return (
    <div className="space-y-6">
      <MatchesFilterBar
        view={filter}
        layout={layout}
        groupId={groupId}
        betFilter={betFilter}
        groups={groups}
        myBetsCount={myBetsCount}
        funPendingCount={funPendingCount}
        onViewChange={setView}
        onLayoutChange={setLayoutPersist}
        onGroupChange={setGroup}
        onBetFilterChange={setBetFilter}
      />

      {byGroup.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/30 p-10 text-center text-muted-foreground">
          Aucun match à venir dans cette sélection.
        </p>
      ) : displayMatches.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/30 p-10 text-center text-muted-foreground">
          {betFilter === "my-bets"
            ? "Aucun pronostic classique dans cette sélection."
            : betFilter === "fun-pending"
              ? "Aucun pari fun en attente sur vos matchs ici."
              : "Aucun match dans cette sélection."}
        </p>
      ) : layout === "calendar" ? (
        <MatchesCalendarView
          matches={displayMatches}
          betStatuses={betStatuses}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayMatches.map((match) => (
            <div key={match.id} className="space-y-1">
              {match.stage && match.stage !== "group" && (
                <p className="text-xs font-medium text-primary">
                  {STAGE_LABELS[match.stage]}
                </p>
              )}
              <MatchCard match={match} betStatus={betStatuses[match.id]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
