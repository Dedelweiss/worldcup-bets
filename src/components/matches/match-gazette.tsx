import { Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MatchGazetteProps {
  summary: string;
  className?: string;
}

export function MatchGazette({ summary, className }: MatchGazetteProps) {
  return (
    <Card
      className={cn(
        "border-lime-400/50 bg-gradient-to-br from-lime-400/10 via-card to-card shadow-lg shadow-lime-400/10 ring-1 ring-lime-400/25",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full border border-lime-400/40 bg-lime-400/15">
            <Bot className="size-5 text-lime-300" aria-hidden />
          </span>
          <CardTitle className="text-base text-lime-100">
            La Gazette du Match
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {summary}
        </p>
      </CardContent>
    </Card>
  );
}
