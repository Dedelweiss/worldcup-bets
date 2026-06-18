"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw, Shield, Zap } from "lucide-react";
import {
  adminRestoreUserBoostAction,
  adminRestoreUserTackleAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { AdminUserJokers } from "@/lib/admin/user-jokers";
import { tacklePhaseLabel } from "@/lib/admin/user-jokers";
import type { TacklePhase } from "@/types/database";
import { cn } from "@/lib/utils";

interface UserJokersAdminFieldsProps {
  userId: string;
  jokers: AdminUserJokers;
}

const TACKLE_PHASES: TacklePhase[] = ["group", "knockout"];

function StatusBadge({
  available,
  detail,
}: {
  available: boolean;
  detail?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        available
          ? "bg-primary/10 text-primary"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      {available ? "Disponible" : "Utilisé"}
      {detail ? ` · ${detail}` : null}
    </span>
  );
}

export function UserJokersAdminFields({
  userId,
  jokers,
}: UserJokersAdminFieldsProps) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const boostAvailable = jokers.boostsAvailable > 0;
  const boostDetail =
    !boostAvailable && jokers.hasPendingBoostedBet
      ? "pari en cours"
      : undefined;

  async function restoreBoost() {
    if (
      !window.confirm(
        "Redonner le boost x2 à ce joueur ? Un pari boosté en attente sera déboosté.",
      )
    ) {
      return;
    }

    setLoadingKey("boost");
    setError(null);
    setMessage(null);

    const result = await adminRestoreUserBoostAction(userId);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage("Boost redonné.");
      router.refresh();
    }
    setLoadingKey(null);
  }

  async function restoreTackle(phase: TacklePhase) {
    const label = tacklePhaseLabel(phase);
    const tackle = jokers.tackles.find((t) => t.phase === phase);
    const resolvedNote = tackle?.isResolved
      ? "\n\nLes points du tacle seront annulés."
      : "";

    if (
      !window.confirm(
        `Redonner le tacle (${label}) à ce joueur ?${resolvedNote}`,
      )
    ) {
      return;
    }

    setLoadingKey(phase);
    setError(null);
    setMessage(null);

    const result = await adminRestoreUserTackleAction(userId, phase);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage(`Tacle ${label.toLowerCase()} redonné.`);
      router.refresh();
    }
    setLoadingKey(null);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5">
          <Zap className="size-3.5 shrink-0 text-amber-500" aria-hidden />
          <span className="text-[11px] font-medium text-muted-foreground">
            Boost
          </span>
          <StatusBadge available={boostAvailable} detail={boostDetail} />
          {!boostAvailable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-[11px]"
              disabled={loadingKey !== null}
              onClick={restoreBoost}
              title="Redonner le boost x2"
            >
              <RotateCcw className="size-3" aria-hidden />
              {loadingKey === "boost" ? "…" : "Redonner"}
            </Button>
          )}
        </div>

        {TACKLE_PHASES.map((phase) => {
          const tackle = jokers.tackles.find((t) => t.phase === phase);
          const available = !tackle;
          const detail = tackle
            ? tackle.isResolved
              ? `match #${tackle.matchId} · résolu`
              : `match #${tackle.matchId}`
            : undefined;

          return (
            <div key={phase} className="flex items-center gap-1.5">
              <Shield className="size-3.5 shrink-0 text-lime-500" aria-hidden />
              <span className="text-[11px] font-medium text-muted-foreground">
                Tacle {tacklePhaseLabel(phase)}
              </span>
              <StatusBadge available={available} detail={detail} />
              {!available && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-[11px]"
                  disabled={loadingKey !== null}
                  onClick={() => restoreTackle(phase)}
                  title={`Redonner le tacle ${tacklePhaseLabel(phase).toLowerCase()}`}
                >
                  <RotateCcw className="size-3" aria-hidden />
                  {loadingKey === phase ? "…" : "Redonner"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && !error && (
        <p className="text-[11px] text-primary">{message}</p>
      )}
    </div>
  );
}
