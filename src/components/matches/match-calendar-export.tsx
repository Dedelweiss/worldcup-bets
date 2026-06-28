"use client";

import { CalendarPlus } from "lucide-react";
import {
  buildGoogleCalendarUrl,
  downloadMatchIcs,
  type MatchCalendarEventInput,
} from "@/lib/matches/calendar-export";
import { cn } from "@/lib/utils";

interface MatchCalendarExportProps {
  match: MatchCalendarEventInput;
  pageUrl: string;
  className?: string;
}

export function MatchCalendarExport({
  match,
  pageUrl,
  className,
}: MatchCalendarExportProps) {
  const googleUrl = buildGoogleCalendarUrl(match, pageUrl);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarPlus className="size-3.5 shrink-0" aria-hidden />
        Ajouter au calendrier
      </span>
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-white/20 hover:bg-white/10"
      >
        Google
      </a>
      <button
        type="button"
        onClick={() => downloadMatchIcs(match, pageUrl)}
        className="inline-flex cursor-pointer items-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-white/20 hover:bg-white/10"
      >
        Apple / iCal
      </button>
    </div>
  );
}
