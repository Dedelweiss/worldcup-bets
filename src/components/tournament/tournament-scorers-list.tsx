import type { TournamentScorer } from "@/types/database";
import { Goal } from "lucide-react";

interface TournamentScorersListProps {
  scorers: TournamentScorer[];
  syncedAt: string | null;
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  showTeamName?: boolean;
  compact?: boolean;
}

export function TournamentScorersList({
  scorers,
  syncedAt,
  title = "Buteurs au tournoi",
  subtitle,
  emptyMessage = "Aucun buteur enregistré pour le moment.",
  showTeamName = false,
  compact = false,
}: TournamentScorersListProps) {
  if (!scorers.length) {
    return (
      <section className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/20 p-6 text-center sm:p-8">
        <Goal className="mx-auto size-7 text-muted-foreground/60" aria-hidden />
        {title ? <h2 className="mt-3 text-lg font-semibold">{title}</h2> : null}
        <p className={title ? "mt-1 text-sm text-muted-foreground" : "mt-3 text-sm text-muted-foreground"}>
          {emptyMessage}
        </p>
      </section>
    );
  }

  const totalGoals = scorers.reduce((sum, s) => sum + s.goals, 0);

  return (
    <section className="space-y-3">
      {title ? (
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {subtitle ??
              `${scorers.length} joueur${scorers.length > 1 ? "s" : ""} · ${totalGoals} but${totalGoals > 1 ? "s" : ""} au total`}
            {syncedAt
              ? ` · maj. ${new Date(syncedAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : null}
          </p>
        </div>
      ) : null}

      <ol className={compact ? "space-y-1.5" : "space-y-2"}>
        {scorers.map((scorer, index) => (
          <li
            key={scorer.playerId}
            className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/35 px-3 py-2.5"
          >
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sm font-bold tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <div className="flex-1 space-y-1.5">
              <p className="font-medium leading-snug [overflow-wrap:anywhere]">
                {scorer.playerName}
              </p>
              {(showTeamName || scorer.assists != null) && (
                <ul className="flex flex-wrap gap-1.5">
                  {showTeamName ? (
                    <li className="rounded-md bg-white/[0.05] px-2 py-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      {scorer.teamName}
                    </li>
                  ) : null}
                  {scorer.assists != null ? (
                    <li className="rounded-md bg-white/[0.05] px-2 py-0.5 text-xs text-muted-foreground">
                      {scorer.assists} passe{scorer.assists > 1 ? "s" : ""} D
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
            <span className="mt-0.5 flex shrink-0 items-center gap-1 text-lg font-bold tabular-nums text-primary">
              <Goal className="size-4 opacity-70" aria-hidden />
              {scorer.goals}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
