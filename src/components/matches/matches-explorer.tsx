"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MatchCard } from "@/components/dashboard/match-card";
import { Select } from "@/components/ui/select";
import {
  sortMatchesByUserPriority,
  type UserMatchBetStatus,
} from "@/lib/bets/user-match-status";
import { STAGE_LABELS } from "@/lib/tournament/constants";
import type { MatchWithTeams, TournamentGroup } from "@/types/database";

export type MatchBetFilter = "all" | "my-bets" | "fun-pending";

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
  const filter = searchParams.get("view") === "knockout" ? "knockout" : "group";
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

  function setGroup(id: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("view", "group");
    if (id) p.set("group", id);
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView("group")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            filter === "group"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Groupes
        </button>
        <button
          type="button"
          onClick={() => setView("knockout")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            filter === "knockout"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Phase finale
        </button>
        <Link
          href="/bracket"
          className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Voir l&apos;arbre →
        </Link>
        {filter === "group" && (
          <Link
            href="/matches/quick"
            className="rounded-lg border border-lime-400/40 bg-lime-400/10 px-4 py-2 text-sm font-medium text-lime-300 hover:bg-lime-400/20"
          >
            Mode rapide ⚡
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "all" as const, label: "Tous" },
            { key: "my-bets" as const, label: `Mes pronostics (${myBetsCount})` },
            {
              key: "fun-pending" as const,
              label: `Paris fun à jouer (${funPendingCount})`,
            },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setBetFilter(opt.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              betFilter === opt.key
                ? opt.key === "fun-pending"
                  ? "bg-amber-500 text-white"
                  : "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filter === "group" && groups.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="groupFilter" className="text-sm text-muted-foreground">
            Groupe
          </label>
          <Select
            id="groupFilter"
            value={groupId ?? ""}
            onChange={(e) => setGroup(e.target.value)}
            className="max-w-[180px]"
          >
            <option value="">Tous les groupes</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {byGroup.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Aucun match à venir dans cette sélection.
        </p>
      ) : displayMatches.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          {betFilter === "my-bets"
            ? "Aucun pronostic classique dans cette sélection."
            : betFilter === "fun-pending"
              ? "Aucun pari fun en attente sur vos matchs ici."
              : "Aucun match dans cette sélection."}
        </p>
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
