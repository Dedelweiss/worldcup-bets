import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AiPlayerBadgeProps {
  className?: string;
}

export function AiPlayerBadge({ className }: AiPlayerBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-0.5 border-violet-500/40 bg-violet-500/10 px-1.5 py-0 text-[10px] font-medium text-violet-700 dark:text-violet-300",
        className,
      )}
    >
      <Bot className="size-2.5" aria-hidden />
      IA
    </Badge>
  );
}
