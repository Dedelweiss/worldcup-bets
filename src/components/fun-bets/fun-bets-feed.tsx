"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useFunBetsNotificationsContext } from "@/components/fun-bets/fun-bets-notifications-context";
import { TeamFlag } from "@/components/shared/team-flag";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FunMarketFeedItem } from "@/lib/fun-markets";

interface FunBetsFeedProps {
  items: FunMarketFeedItem[];
}

export function FunBetsFeed({ items }: FunBetsFeedProps) {
  const { markMarketsSeen } = useFunBetsNotificationsContext();

  useEffect(() => {
    if (items.length > 0) {
      markMarketsSeen(items.map((i) => i.id));
    }
  }, [items, markMarketsSeen]);

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Aucun pari fun ouvert pour le moment. Vous serez notifié dès qu&apos;un
        admin en publie un.
      </p>
    );
  }

  const byMatch = items.reduce<
    Record<number, { match: FunMarketFeedItem["match"]; markets: FunMarketFeedItem[] }>
  >((acc, item) => {
    if (!acc[item.match_id]) {
      acc[item.match_id] = { match: item.match, markets: [] };
    }
    acc[item.match_id].markets.push(item);
    return acc;
  }, {});

  return (
    <ul className="space-y-4">
      {Object.entries(byMatch).map(([matchId, { match, markets }]) => (
        <li
          key={matchId}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <TeamFlag
                name={match.home_team.name}
                code={match.home_team.code}
                logoUrl={match.home_team.logo_url}
                size={28}
              />
              <span className="text-xs text-muted-foreground">vs</span>
              <TeamFlag
                name={match.away_team.name}
                code={match.away_team.code}
                logoUrl={match.away_team.logo_url}
                size={28}
              />
              <span className="truncate font-semibold">
                {match.home_team.name} – {match.away_team.name}
              </span>
            </div>
            <Link
              href={`/matches/${matchId}#paris-fun`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Parier
            </Link>
          </div>
          <ul className="divide-y divide-border/60">
            {markets.map((market) => (
              <li key={market.id} className="px-4 py-3">
                <p className="text-sm font-medium">{market.question}</p>
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  Oui {market.odd_yes} · Non {market.odd_no}
                </p>
              </li>
            ))}
          </ul>
          {match.status === "live" && (
            <div className="border-t border-border/60 px-4 py-2">
              <Badge className="text-[10px]">En direct</Badge>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
