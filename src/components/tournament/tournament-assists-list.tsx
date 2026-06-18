import type { TournamentScorer } from "@/types/database";
import { Sparkles } from "lucide-react";

interface TournamentAssistsListProps {
  scorers: TournamentScorer[];
  syncedAt?: string | null;
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  showTeamName?: boolean;
  compact?: boolean;
}

export function TournamentAssistsList({
  scorers,
  syncedAt,
  title = "Passeurs décisifs au tournoi",
  subtitle,
  emptyMessage = "Aucune passe décisive enregistrée pour le moment.",
  showTeamName = false,
  compact = false,
}: TournamentAssistsListProps) {
  if (!scorers.length) {
    return (
      <section className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/20 p-6 text-center sm:p-8">
        <Sparkles
          className="mx-auto size-7 text-muted-foreground/60"
          aria-hidden
        />
        {title ? <h2 className="mt-3 text-lg font-semibold">{title}</h2> : null}
        <p
          className={
            title
              ? "mt-1 text-sm text-muted-foreground"
              : "mt-3 text-sm text-muted-foreground"
          }
        >
          {emptyMessage}
        </p>
      </section>
    );
  }

  const totalAssists = scorers.reduce((sum, s) => sum + (s.assists ?? 0), 0);

  return (
    <section className="space-y-3">
      {title ? (
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {subtitle ??
              `${scorers.length} joueur${scorers.length > 1 ? "s" : ""} · ${totalAssists} passe${totalAssists > 1 ? "s" : ""} D au total`}
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
              {showTeamName ? (
                <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  {scorer.teamName}
                </p>
              ) : null}
            </div>
            <span className="mt-0.5 flex shrink-0 items-center gap-1 text-lg font-bold tabular-nums text-violet-400">
              <Sparkles className="size-4 opacity-70" aria-hidden />
              {scorer.assists ?? 0}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
