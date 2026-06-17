import { Sparkles } from "lucide-react";
import { FunBetSlip } from "@/components/bets/fun-bet-slip";
import { Badge } from "@/components/ui/badge";
import type { MatchUserFunBet } from "@/lib/bets/match-user-fun-bets";
import type { FunMarketParticipationByMarket } from "@/lib/bets/fun-market-participation";
import { isFunMarketBettingOpen } from "@/lib/bets/fun-market-betting";
import { cn } from "@/lib/utils";
import type { FunMarket, MatchWithTeams } from "@/types/database";

const STATUS_SORT: Record<FunMarket["status"], number> = {
  open: 0,
  closed: 1,
  settled: 2,
};

interface MatchFunBetsSectionProps {
  markets: FunMarket[];
  match: Pick<MatchWithTeams, "status" | "kickoff_at">;
  funBetsByMarket: Map<string, MatchUserFunBet>;
  funParticipationByMarket: FunMarketParticipationByMarket;
  currentUserId: string;
  isGoldenMatch?: boolean;
  className?: string;
}

export function MatchFunBetsSection({
  markets,
  match,
  funBetsByMarket,
  funParticipationByMarket,
  currentUserId,
  isGoldenMatch = false,
  className,
}: MatchFunBetsSectionProps) {
  if (markets.length === 0) return null;

  const openCount = markets.filter((m) => isFunMarketBettingOpen(m, match)).length;
  const playedCount = markets.filter((m) => funBetsByMarket.has(m.id)).length;

  const sortedMarkets = [...markets].sort(
    (a, b) => STATUS_SORT[a.status] - STATUS_SORT[b.status],
  );

  return (
    <section
      id="paris-fun"
      className={cn("scroll-mt-28 md:scroll-mt-32", className)}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-amber-500/20",
          "bg-gradient-to-br from-amber-500/[0.08] via-card to-violet-500/[0.06]",
          "shadow-[0_0_40px_-20px] shadow-amber-500/25",
        )}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-amber-400/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full bg-violet-500/10 blur-3xl"
          aria-hidden
        />

        <header className="relative border-b border-amber-500/15 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/25">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                <h2 className="text-lg font-bold tracking-tight">Paris fun</h2>
                {openCount > 0 && (
                  <Badge className="animate-pulse border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    {openCount} ouvert{openCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="max-w-xl text-sm text-muted-foreground">
                Pré-match : pariables avant le coup d&apos;envoi. Live : fenêtre
                de 2 minutes en direct. Les paris événementiels en cours de
                match sont interdits.
              </p>
            </div>
            {playedCount > 0 && (
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {playedCount}/{markets.length} joué{playedCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </header>

        <div className="relative grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          {sortedMarkets.map((market) => (
            <FunBetSlip
              key={market.id}
              market={market}
              match={match}
              isGoldenMatch={isGoldenMatch}
              userBet={funBetsByMarket.get(market.id) ?? null}
              participants={funParticipationByMarket.get(market.id) ?? []}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
