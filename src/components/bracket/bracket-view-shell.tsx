"use client";

import { useEffect, useState } from "react";
import { GitBranch, LayoutList } from "lucide-react";
import { BracketProjectionNotice } from "@/components/bracket/bracket-projection-notice";
import { BracketRoundExplorer } from "@/components/bracket/bracket-round-explorer";
import { BracketTree } from "@/components/bracket/bracket-tree";
import { cn } from "@/lib/utils";
import type {
  BracketProjectionMeta,
  BracketSlotDisplay,
} from "@/lib/tournament/bracket-projection";
import type { UserMatchBetStatus } from "@/lib/bets/user-match-status";

const STORAGE_KEY = "wc2026-bracket-view";

export type BracketViewMode = "tree" | "tours";

interface BracketViewShellProps {
  slots: BracketSlotDisplay[];
  betStatuses?: Record<number, UserMatchBetStatus>;
  isAdmin?: boolean;
  projectionMeta?: BracketProjectionMeta;
}

function readStoredMode(): BracketViewMode {
  if (typeof window === "undefined") return "tours";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "tree" || stored === "tours" ? stored : "tours";
}

export function BracketViewShell({
  slots,
  betStatuses = {},
  isAdmin,
  projectionMeta,
}: BracketViewShellProps) {
  const [mode, setMode] = useState<BracketViewMode>("tours");

  useEffect(() => {
    setMode(readStoredMode());
  }, []);

  const setModePersist = (next: BracketViewMode) => {
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const hasR32 = slots.some((s) => s.stage === "r32");

  return (
    <div className="min-w-0 space-y-4">
      {projectionMeta?.hasGroupData && (
        <BracketProjectionNotice meta={projectionMeta} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {mode === "tree"
            ? "Vue arbre — tous les tours en un coup d’œil"
            : "Vue par tour — détail match par match"}
        </p>
        <div
          className="inline-flex rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5 shadow-sm"
          role="tablist"
          aria-label="Mode d'affichage du tableau"
        >
          <ViewModeButton
            active={mode === "tours"}
            onClick={() => setModePersist("tours")}
            icon={<LayoutList className="size-3.5" aria-hidden />}
            label="Par tour"
          />
          <ViewModeButton
            active={mode === "tree"}
            onClick={() => setModePersist("tree")}
            icon={<GitBranch className="size-3.5" aria-hidden />}
            label="Arbre"
          />
        </div>
      </div>

      {mode === "tree" ? (
        <BracketTree slots={slots} full={hasR32} />
      ) : (
        <BracketRoundExplorer
          slots={slots}
          betStatuses={betStatuses}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

function ViewModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-[var(--dur-fast)]",
        active
          ? "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/25"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
