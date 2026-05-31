import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GoldenMatchBadgeProps {
  className?: string;
  compact?: boolean;
}

export function GoldenMatchBadge({ className, compact }: GoldenMatchBadgeProps) {
  return (
    <Badge
      className={cn(
        "border-amber-400/60 bg-amber-500/20 text-amber-950 dark:text-amber-100",
        "gap-1 font-semibold shadow-sm",
        className,
      )}
    >
      <Sparkles className={cn("size-3 shrink-0 text-amber-500", compact && "size-2.5")} />
      {compact ? "Golden" : "Golden Match · gains ×2"}
    </Badge>
  );
}
