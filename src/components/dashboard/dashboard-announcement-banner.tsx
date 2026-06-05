import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardAnnouncementBannerProps {
  message: string;
  className?: string;
}

export function DashboardAnnouncementBanner({
  message,
  className,
}: DashboardAnnouncementBannerProps) {
  const lines = message.trim().split(/\n/).filter(Boolean);
  if (lines.length === 0) return null;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border border-fuchsia-500/35 bg-fuchsia-500/10 px-4 py-3 backdrop-blur-md",
        "ring-1 ring-lime-400/15",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Megaphone
        className="mt-0.5 size-5 shrink-0 text-fuchsia-400"
        aria-hidden
      />
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-300">
          Annonce
        </p>
        {lines.map((line) => (
          <p key={line} className="text-sm leading-snug text-foreground/95">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
