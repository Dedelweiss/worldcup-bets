import { Clock } from "lucide-react";
import { formatKickoff, formatKickoffRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MatchKickoffMetaProps {
  kickoffAt: string;
  align?: "start" | "center" | "end";
  className?: string;
}

/** Date + délai avant coup d'envoi, empilés pour éviter l'écrasement en en-tête de carte. */
export function MatchKickoffMeta({
  kickoffAt,
  align = "end",
  className,
}: MatchKickoffMetaProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-0.5",
        align === "end"
          ? "items-end text-right"
          : align === "center"
            ? "items-center text-center"
            : "items-start text-left",
        className,
      )}
    >
      <time
        dateTime={kickoffAt}
        className="flex items-center gap-1 whitespace-nowrap text-xs font-medium tabular-nums leading-tight text-foreground/90"
      >
        <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        {formatKickoff(kickoffAt)}
      </time>
      <span className="whitespace-nowrap text-[11px] leading-tight text-muted-foreground">
        {formatKickoffRelative(kickoffAt)}
      </span>
    </div>
  );
}
