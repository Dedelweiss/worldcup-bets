"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  GitBranch,
  LayoutGrid,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TournamentGroup } from "@/types/database";

export type MatchBetFilter = "all" | "my-bets" | "fun-pending";

interface MatchesFilterBarProps {
  view: "group" | "knockout";
  groupId?: number;
  betFilter: MatchBetFilter;
  groups: TournamentGroup[];
  myBetsCount: number;
  funPendingCount: number;
  onViewChange: (view: "group" | "knockout") => void;
  onGroupChange: (groupId: number | null) => void;
  onBetFilterChange: (filter: MatchBetFilter) => void;
}

const VIEW_TABS = [
  { id: "group" as const, label: "Groupes", icon: Users },
  { id: "knockout" as const, label: "Phase finale", icon: Trophy },
];

const BET_FILTERS: {
  id: MatchBetFilter;
  label: string;
  shortLabel: string;
  icon: typeof LayoutGrid;
  accent?: "amber";
}[] = [
  { id: "all", label: "Tous les matchs", shortLabel: "Tous", icon: LayoutGrid },
  {
    id: "my-bets",
    label: "Mes pronostics",
    shortLabel: "Mes paris",
    icon: Target,
  },
  {
    id: "fun-pending",
    label: "Paris fun à jouer",
    shortLabel: "Fun à jouer",
    icon: Sparkles,
    accent: "amber",
  },
];

export function MatchesFilterBar({
  view,
  groupId,
  betFilter,
  groups,
  myBetsCount,
  funPendingCount,
  onViewChange,
  onGroupChange,
  onBetFilterChange,
}: MatchesFilterBarProps) {
  function betCount(id: MatchBetFilter): number | null {
    if (id === "my-bets") return myBetsCount;
    if (id === "fun-pending") return funPendingCount;
    return null;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-4 shadow-xl shadow-black/20 backdrop-blur-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="relative flex w-full rounded-xl border border-white/10 bg-zinc-950/80 p-1 sm:max-w-xs"
          role="tablist"
          aria-label="Phase du tournoi"
        >
          {VIEW_TABS.map((tab) => {
            const active = view === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onViewChange(tab.id)}
                className={cn(
                  "relative flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "text-black" : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="calendar-view-tab"
                    className="absolute inset-0 rounded-lg bg-lime-400 shadow-lg shadow-lime-400/30"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon className="relative z-10 size-4 shrink-0" aria-hidden />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/bracket"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <GitBranch className="size-4 text-lime-400" aria-hidden />
            Arbre
          </Link>
          {view === "group" && (
            <Link
              href="/matches/quick"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-lime-400/40 bg-lime-400/10 px-3 py-2 text-sm font-medium text-lime-300 transition-colors hover:bg-lime-400/20"
            >
              <Zap className="size-4" aria-hidden />
              Mode rapide
            </Link>
          )}
        </div>
      </div>

      {view === "group" && groups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Poule
          </p>
          <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => onGroupChange(null)}
              className={cn(
                "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                groupId == null
                  ? "border-lime-400/60 bg-lime-400/15 text-lime-300 shadow-sm shadow-lime-400/10"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200",
              )}
            >
              Toutes
            </button>
            {groups.map((g) => {
              const active = groupId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onGroupChange(g.id)}
                  title={g.name}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 font-heading text-sm font-bold transition-all",
                    active
                      ? "border-lime-400/60 bg-lime-400 text-black shadow-md shadow-lime-400/25"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10",
                  )}
                >
                  {g.letter}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Afficher
        </p>
        <div className="flex flex-wrap gap-2">
          {BET_FILTERS.map((opt) => {
            const active = betFilter === opt.id;
            const count = betCount(opt.id);
            const Icon = opt.icon;
            const isAmber = opt.accent === "amber";

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onBetFilterChange(opt.id)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all",
                  active && !isAmber &&
                    "border-lime-400/50 bg-lime-400/15 text-lime-300 shadow-sm shadow-lime-400/10",
                  active && isAmber &&
                    "border-amber-400/50 bg-amber-400/15 text-amber-200 shadow-sm shadow-amber-400/10",
                  !active &&
                    "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active && !isAmber && "text-lime-400",
                    active && isAmber && "text-amber-400",
                  )}
                  aria-hidden
                />
                <span className="hidden sm:inline">{opt.label}</span>
                <span className="sm:hidden">{opt.shortLabel}</span>
                {count != null && (
                  <span
                    className={cn(
                      "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums",
                      active && !isAmber && "bg-lime-400/25 text-lime-200",
                      active && isAmber && "bg-amber-400/25 text-amber-100",
                      !active && "bg-white/10 text-zinc-400",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
