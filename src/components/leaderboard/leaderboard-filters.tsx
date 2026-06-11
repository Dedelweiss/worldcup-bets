"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { LeagueWithMeta } from "@/lib/leagues";
import type { LeaderboardScope, LeaderboardSort } from "@/types/database";

const SCOPE_OPTIONS: { value: LeaderboardScope; label: string }[] = [
  { value: "general", label: "Général" },
  { value: "league", label: "Mes ligues" },
];

const SORT_OPTIONS: { value: LeaderboardSort; label: string; short: string }[] = [
  { value: "points", label: "Points", short: "pts" },
  { value: "live_points", label: "Classement live", short: "Live" },
  { value: "classic_won", label: "Paris matchs", short: "Résultat" },
  { value: "fun_won", label: "Paris fun", short: "Fun" },
];

interface LeaderboardFiltersProps {
  leagues: LeagueWithMeta[];
  scope: LeaderboardScope;
  leagueId: string | null;
  sort: LeaderboardSort;
}

export function LeaderboardFilters({
  leagues,
  scope,
  leagueId,
  sort,
}: LeaderboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const pushParams = useCallback(
    (patch: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(patch)) {
        if (val === null || val === "") p.delete(key);
        else p.set(key, val);
      }
      startTransition(() => {
        router.push(`/leaderboard?${p.toString()}`);
      });
    },
    [router, searchParams],
  );

  function setScope(next: LeaderboardScope) {
    if (next === "general") {
      pushParams({ scope: "general", league: null });
    } else {
      const first = leagues[0]?.id ?? null;
      pushParams({
        scope: "league",
        league: leagueId ?? first,
      });
    }
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-border bg-card/40 p-4 transition-opacity",
        pending && "opacity-60",
      )}
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Périmètre
        </p>
        <div className="flex flex-wrap gap-2">
          {SCOPE_OPTIONS.map((opt) => (
            <FilterPill
              key={opt.value}
              active={scope === opt.value}
              onClick={() => setScope(opt.value)}
            >
              {opt.label}
            </FilterPill>
          ))}
          {scope === "league" && (
            <div className="flex min-w-[160px] flex-1 items-center gap-2 sm:max-w-[280px]">
              <Select
                value={leagueId ?? ""}
                onChange={(e) =>
                  pushParams({ scope: "league", league: e.target.value })
                }
                className="h-9 flex-1"
                disabled={leagues.length === 0}
              >
                {leagues.length === 0 ? (
                  <option value="">Aucune ligue</option>
                ) : (
                  leagues.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))
                )}
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Classement par
        </p>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((opt) => (
            <FilterPill
              key={opt.value}
              active={sort === opt.value}
              onClick={() => pushParams({ sort: opt.value })}
            >
              <span className="sm:hidden">{opt.short}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </FilterPill>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
