import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PoolVoteRow } from "@/lib/tournament/tournament-stats-data";
import { Trophy, Users } from "lucide-react";

interface PoolPredictionsSectionProps {
  campaignLabel: string;
  campaignEmoji: string;
  totalResponses: number;
  votes: PoolVoteRow[];
  /** Rendu à l'intérieur d'une StatsSection (sans en-tête dupliqué) */
  embedded?: boolean;
}

export function PoolPredictionsSection({
  campaignLabel,
  campaignEmoji,
  totalResponses,
  votes,
  embedded = false,
}: PoolPredictionsSectionProps) {
  if (!votes.length) {
    return (
      <div
        className={cn(
          embedded
            ? "rounded-xl border border-dashed border-white/10 py-12 text-center"
            : "rounded-2xl border border-dashed border-white/10 bg-zinc-900/20 p-6 text-center sm:p-8",
        )}
      >
        <Users
          className="mx-auto size-8 text-muted-foreground/50"
          aria-hidden
        />
        {!embedded ? (
          <h2 className="mt-3 text-lg font-semibold">Pronostics du pool</h2>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          Aucune réponse au formulaire {campaignEmoji} {campaignLabel} pour le
          moment.
        </p>
      </div>
    );
  }

  const byQuestion = votes.reduce<Map<string, PoolVoteRow[]>>((acc, vote) => {
    const list = acc.get(vote.questionId) ?? [];
    list.push(vote);
    acc.set(vote.questionId, list);
    return acc;
  }, new Map());

  return (
    <div className="space-y-5">
      {!embedded ? (
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Pronostics du pool {campaignEmoji}
          </h2>
          <p className="text-sm text-muted-foreground">
            Réponses au formulaire {campaignLabel} · {totalResponses} joueur
            {totalResponses > 1 ? "s" : ""}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {[...byQuestion.entries()].map(([questionId, rows]) => {
          const leader = rows[0];
          const leaderPercent = leader?.percent ?? 0;

          return (
            <div
              key={questionId}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold leading-snug text-foreground/90">
                  {rows[0]?.questionTitle}
                </h3>
                {leader ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-300">
                    <Trophy className="size-3" aria-hidden />
                    Top
                  </span>
                ) : null}
              </div>

              {leader ? (
                <div className="mb-4 rounded-lg border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-transparent p-3">
                  <p className="text-xs text-muted-foreground">Favori du pool</p>
                  <p className="mt-0.5 font-bold leading-snug">{leader.label}</p>
                  {leader.sublabel ? (
                    <p className="text-xs text-muted-foreground">
                      {leader.sublabel}
                    </p>
                  ) : null}
                  <p className="mt-2 text-2xl font-black tabular-nums text-rose-400">
                    {leader.percent}%
                  </p>
                </div>
              ) : null}

              <ol className="space-y-2.5">
                {rows.map((row, index) => (
                  <li key={`${row.questionId}-${row.label}-${index}`}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums",
                            index === 0
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-white/[0.06] text-muted-foreground",
                          )}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.label}</p>
                          {row.sublabel ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {row.sublabel}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold tabular-nums text-primary">
                          {row.percent}%
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {row.count} vote{row.count > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          index === 0
                            ? "bg-gradient-to-r from-rose-500 to-rose-400"
                            : "bg-gradient-to-r from-white/25 to-white/15",
                        )}
                        style={{
                          width: `${leaderPercent > 0 ? (row.percent / leaderPercent) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Vous n&apos;avez pas encore répondu ?{" "}
        <Link href="/onboarding" className="font-medium text-primary hover:underline">
          Compléter le formulaire
        </Link>
      </p>
    </div>
  );
}
