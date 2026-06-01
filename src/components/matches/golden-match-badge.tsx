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
        "gap-1 border-fuchsia-500/60 bg-fuchsia-500/20 font-semibold text-fuchsia-100 shadow-sm shadow-fuchsia-500/20",
        className,
      )}
    >
      <Sparkles
        className={cn("size-3 shrink-0 text-fuchsia-400", compact && "size-2.5")}
      />
      {compact ? "Golden" : "Golden Match · gains ×2"}
    </Badge>
  );
}
