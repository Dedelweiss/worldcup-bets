import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

interface LivePointsDisplayProps {
  balance: number;
  livePoints?: number;
  /** Affiche le total (confirmé + live) en valeur principale. */
  showTotal?: boolean;
  className?: string;
  valueClassName?: string;
  liveClassName?: string;
}

export function LivePointsDisplay({
  balance,
  livePoints = 0,
  showTotal = false,
  className,
  valueClassName,
  liveClassName,
}: LivePointsDisplayProps) {
  const live = livePoints > 0 ? livePoints : 0;
  const main = showTotal ? balance + live : balance;

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1.5", className)}>
      <span className={cn("tabular-nums", valueClassName)}>
        {formatPoints(main)}
      </span>
      {live > 0 && (
        <span
          className={cn(
            "font-medium tabular-nums text-lime-400",
            liveClassName,
          )}
          title="Points provisoires — pronostics en bonne voie sur un match en direct"
        >
          +{formatPoints(live)}
        </span>
      )}
    </span>
  );
}
