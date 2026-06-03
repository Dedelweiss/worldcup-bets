import { Badge } from "@/components/ui/badge";
import { hasApiSyncedOdds } from "@/lib/football-data/odds-display";
import type { MatchWithTeams } from "@/types/database";

export function MatchOddsSourceBadge({
  match,
  className,
}: {
  match: Pick<
    MatchWithTeams,
    "odd_home" | "odd_draw" | "odd_away" | "odds_synced_at"
  >;
  className?: string;
}) {
  if (hasApiSyncedOdds(match)) {
    return (
      <Badge variant="outline" className={className}>
        Cotes API
      </Badge>
    );
  }

  if (match.odd_home == null) {
    return (
      <Badge variant="secondary" className={className}>
        Cotes en attente
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      Cotes par défaut
    </Badge>
  );
}
