"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { resolveBetPointsDisplay } from "@/lib/bets/bet-display-points";
import { formatKickoff, formatOdd, formatPoints } from "@/lib/format";
import type {
  AdminFinishedPronoRow,
  AdminPlayerFinishedPronos,
} from "@/lib/admin/finished-pronos-by-player";
import { cn } from "@/lib/utils";
import type { BetStatus } from "@/types/database";

const STATUS_LABEL: Record<BetStatus, string> = {
  pending: "En attente",
  won: "Gagné",
  lost: "Perdu",
  void: "Annulé",
  cancelled: "Annulé",
};

function formatScore(
  home: number | null,
  away: number | null,
): string {
  if (home == null || away == null) return "—";
  return `${home}–${away}`;
}

function PronoRow({ prono }: { prono: AdminFinishedPronoRow }) {
  const pointsDisplay = resolveBetPointsDisplay(
    {
      bet_type: prono.betType,
      status: prono.status,
      selection: prono.selection,
      potential_payout: prono.potentialPayout,
      odd_at_placement: prono.odd,
      is_boosted: prono.isBoosted,
      score_precision: prono.scorePrecision,
    },
    {
      status: "finished",
      home_score: prono.homeScore,
      away_score: prono.awayScore,
      is_golden: prono.isGoldenMatch,
    },
  );

  return (
    <tr className="border-t border-border/60">
      <td className="px-3 py-3 align-top">
        <Link
          href={`/admin/matches/${prono.matchId}`}
          className="font-medium hover:text-primary hover:underline"
        >
          {prono.homeTeamName}{" "}
          <span className="text-muted-foreground">vs</span>{" "}
          {prono.awayTeamName}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatKickoff(prono.kickoffAt)}
        </p>
      </td>
      <td className="px-3 py-3 align-top tabular-nums text-sm font-semibold">
        {formatScore(prono.homeScore, prono.awayScore)}
      </td>
      <td className="min-w-[10rem] px-3 py-3 align-top">
        <p className="text-sm">{prono.selectionLabel}</p>
        {prono.betType === "fun" && (
          <Badge variant="outline" className="mt-1 text-[10px]">
            Fun
          </Badge>
        )}
        {prono.isBoosted && (
          <Badge
            variant="outline"
            className="mt-1 border-amber-500/40 text-[10px] text-amber-600 dark:text-amber-400"
          >
            Boost
          </Badge>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3 align-top tabular-nums text-sm">
        {formatOdd(prono.odd)}
      </td>
      <td className="px-3 py-3 align-top">
        <Badge
          variant={
            prono.status === "won"
              ? "default"
              : prono.status === "lost"
                ? "destructive"
                : "secondary"
          }
          className="text-[10px]"
        >
          {STATUS_LABEL[prono.status]}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-3 py-3 align-top text-right tabular-nums text-sm">
        {pointsDisplay.tone === "lost" ? (
          <span className="text-muted-foreground">0 pt</span>
        ) : pointsDisplay.points != null ? (
          <span
            className={cn(
              "font-semibold",
              pointsDisplay.tone === "won" &&
                "text-emerald-600 dark:text-emerald-400",
            )}
          >
            +{formatPoints(pointsDisplay.points)} pt
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

function PlayerSection({ group }: { group: AdminPlayerFinishedPronos }) {
  const won = group.pronos.filter((p) => p.status === "won").length;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-3">
        <div>
          <h2 className="font-semibold">{group.label}</h2>
          {group.username && (
            <p className="text-xs text-muted-foreground">@{group.username}</p>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {group.pronos.length} prono{group.pronos.length > 1 ? "s" : ""}
          {won > 0 && (
            <span className="ml-2 text-emerald-600 dark:text-emerald-400">
              · {won} gagné{won > 1 ? "s" : ""}
            </span>
          )}
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-muted/20 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Match</th>
              <th className="px-3 py-2 font-medium">Score</th>
              <th className="px-3 py-2 font-medium">Pronostic</th>
              <th className="px-3 py-2 font-medium">Cote</th>
              <th className="px-3 py-2 font-medium">Résultat</th>
              <th className="px-3 py-2 text-right font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {group.pronos.map((prono) => (
              <PronoRow key={prono.id} prono={prono} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface AdminFinishedPronosExplorerProps {
  groups: AdminPlayerFinishedPronos[];
}

export function AdminFinishedPronosExplorer({
  groups,
}: AdminFinishedPronosExplorerProps) {
  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Aucun pronostic sur un match terminé pour le moment.
      </p>
    );
  }

  const totalPronos = groups.reduce((n, g) => n + g.pronos.length, 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {groups.length} joueur{groups.length > 1 ? "s" : ""} · {totalPronos}{" "}
        pronostic{totalPronos > 1 ? "s" : ""} sur matchs terminés
      </p>
      {groups.map((group) => (
        <PlayerSection key={group.userId} group={group} />
      ))}
    </div>
  );
}
