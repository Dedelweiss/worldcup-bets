"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { syncTeamSquadsAdminAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeamSquadSyncStatus } from "@/lib/football-data/sync-team-squads";

interface TeamSquadsSyncPanelProps {
  status: TeamSquadSyncStatus;
}

export function TeamSquadsSyncPanel({ status }: TeamSquadsSyncPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const result = await syncTeamSquadsAdminAction();

    if (!result.success) {
      setError(result.error);
    } else if (result.result) {
      const { synced, remaining, apiCalls } = result.result;
      const total = result.status?.withSquad ?? status.withSquad;
      const pending = result.status?.pending ?? status.pending;
      const scorers = result.scorersResult?.count ?? 0;
      const goalEvents = result.goalEventsResult?.synced ?? 0;

      if (synced === 0 && pending === 0 && scorers === 0 && goalEvents === 0) {
        setMessage("Effectifs, buteurs et buts déjà à jour.");
      } else {
        const parts: string[] = [];
        if (synced > 0) {
          parts.push(
            `${synced} effectif(s) · ${total}/${status.tournamentTeams} équipes`,
          );
        }
        if (scorers > 0) {
          parts.push(`${scorers} buteur(s) au tournoi`);
        }
        if (goalEvents > 0) {
          parts.push(`${goalEvents} match(s) avec buts`);
        }
        parts.push(
          `${apiCalls + (result.scorersResult?.apiCalls ?? 0) + (result.goalEventsResult?.apiCalls ?? 0)} req`,
        );
        if (remaining > 0) {
          parts.push(`${remaining} équipe(s) sans effectif API`);
        }
        setMessage(parts.join(" · "));
      }
      router.refresh();
    }

    setLoading(false);
  }

  const needsLink = status.linkedToApi < status.tournamentTeams;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Users className="size-4 text-primary" aria-hidden />
            Effectifs CDM
          </h2>
          <p className="text-sm text-muted-foreground">
            {status.withSquad}/{status.tournamentTeams} équipes avec effectif en cache
            {status.pending > 0 ? ` · ${status.pending} en attente` : " · complet"}
          </p>
          <p className="text-xs text-muted-foreground">
            Un clic importe les effectifs, le classement buteurs et enrichit les
            buts par match (cache, pas d&apos;appel externe au chargement).
          </p>
          {needsLink && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {status.tournamentTeams - status.linkedToApi} équipe(s) sans lien
              football-data.org — lancez d&apos;abord « Sync live + cotes API » sur
              /admin.
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void handleSync()}
          className="shrink-0 gap-1.5"
        >
          <Users className={cn("size-3.5", loading && "animate-pulse")} />
          Synchroniser les effectifs
        </Button>
      </div>

      {message && (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
