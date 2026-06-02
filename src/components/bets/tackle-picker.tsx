"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Shield, Swords, X } from "lucide-react";
import {
  cancelTackleAction,
  placeTackleAction,
  updateTackleAction,
} from "@/app/(app)/matches/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  displayPlayerName,
  type MatchTackleState,
} from "@/lib/bets/match-tackle-utils";
import type { MatchParticipationPlayer } from "@/lib/bets/match-participation";
import { cn } from "@/lib/utils";

interface TacklePickerProps {
  matchId: number;
  currentUserId: string;
  hasClassicBet: boolean;
  bettingOpen: boolean;
  rivals: MatchParticipationPlayer[];
  tackleState: MatchTackleState;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function RivalList({
  rivals,
  loading,
  currentTargetId,
  onSelect,
}: {
  rivals: MatchParticipationPlayer[];
  loading: boolean;
  currentTargetId?: string;
  onSelect: (targetId: string) => void;
}) {
  const available = currentTargetId
    ? rivals.filter((r) => r.user_id !== currentTargetId)
    : rivals;

  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun autre parieur disponible pour l&apos;instant.
      </p>
    );
  }

  return (
    <ul className="max-h-48 space-y-1 overflow-y-auto">
      {available.map((rival) => {
        const name = displayPlayerName(rival.username, rival.display_name);
        return (
          <li key={rival.user_id}>
            <button
              type="button"
              disabled={loading}
              onClick={() => onSelect(rival.user_id)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/60 disabled:opacity-50"
            >
              <Avatar className="size-7">
                {rival.avatar_url ? (
                  <AvatarImage src={rival.avatar_url} alt={name} />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function TacklePicker({
  matchId,
  hasClassicBet,
  bettingOpen,
  rivals,
  tackleState,
}: TacklePickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phaseQuota = tackleState.quotas.find((q) => q.phase === tackleState.phase);
  const phaseUsedElsewhere =
    phaseQuota?.used && phaseQuota.usedMatchId !== matchId;
  const existing = tackleState.matchTackle;
  const canEditTackle = Boolean(existing && bettingOpen && !existing.is_resolved);

  if (!bettingOpen && !existing) return null;

  async function handlePlace(targetId: string) {
    setLoading(true);
    setError(null);
    const result = await placeTackleAction(matchId, targetId);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function handleUpdate(targetId: string) {
    if (!existing) return;

    setLoading(true);
    setError(null);
    const result = await updateTackleAction(existing.id, matchId, targetId);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setEditing(false);
    router.refresh();
  }

  async function handleCancel() {
    if (!existing) return;
    if (!confirm("Annuler ton Tacle Glissé ? Tu pourras en choisir un autre.")) {
      return;
    }

    setLoading(true);
    setError(null);
    const result = await cancelTackleAction(existing.id, matchId);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setEditing(false);
    router.refresh();
  }

  if (existing) {
    const targetName = displayPlayerName(
      existing.target_username,
      existing.target_display_name,
    );

    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-lime-400/30 bg-lime-400/5 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Swords className="size-4 shrink-0 text-lime-400" />
            <span>
              Tacle Glissé sur{" "}
              <span className="font-semibold text-lime-300">{targetName}</span>
            </span>
          </div>
          {existing.is_resolved ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {existing.attacker_won
                ? "Tacle réussi — +3 pts volés à ton rival."
                : "Tacle raté — -3 pts."}
            </p>
          ) : canEditTackle ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Modifiable ou annulable avant le coup d&apos;envoi.
            </p>
          ) : null}
        </div>

        {canEditTackle && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 border-lime-400/40 text-lime-300 hover:bg-lime-400/10"
                disabled={loading}
                onClick={() => {
                  setEditing((prev) => !prev);
                  setError(null);
                }}
              >
                Changer de rival
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    editing && "rotate-180",
                  )}
                />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 text-muted-foreground hover:text-destructive"
                disabled={loading}
                onClick={handleCancel}
              >
                <X className="size-3.5" />
                Annuler
              </Button>
            </div>

            {editing && (
              <div className="rounded-xl border border-border/80 bg-popover p-3 text-popover-foreground shadow-lg shadow-primary/10">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Choisis un nouveau rival :
                </p>
                <RivalList
                  rivals={rivals}
                  loading={loading}
                  currentTargetId={existing.target_id}
                  onSelect={handleUpdate}
                />
                {error && (
                  <p className="mt-2 text-xs text-destructive">{error}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (!hasClassicBet || phaseUsedElsewhere) {
    const reason = !hasClassicBet
      ? "Place d'abord ton pronostic pour tacler un rival."
      : "Tu as déjà utilisé ton tacle pour cette phase.";
    return (
      <div className="flex items-start gap-2 rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
        <Shield className="mt-0.5 size-3.5 shrink-0" />
        <span>{reason}</span>
      </div>
    );
  }

  return (
    <div className="relative z-10 space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-9 w-full gap-2 border-lime-400/40 text-lime-300 hover:bg-lime-400/10"
        disabled={loading}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Swords className="size-4" />
        Tacle Glissé — choisir un rival
        <ChevronDown
          className={cn(
            "ml-auto size-4 transition-transform",
            open && "rotate-180",
          )}
        />
      </Button>

      {open && (
        <div className="rounded-xl border border-border/80 bg-popover p-3 text-popover-foreground shadow-lg shadow-primary/10">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            1 tacle par phase. Gagne +3 pts si tu fais mieux que ta cible sur ce
            match, sinon -3.
          </p>
          {rivals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun autre parieur sur ce match pour l&apos;instant. Reviens quand
              un rival aura posé son pronostic.
            </p>
          ) : (
            <RivalList rivals={rivals} loading={loading} onSelect={handlePlace} />
          )}
          {error && (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
