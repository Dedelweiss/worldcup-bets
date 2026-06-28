import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { F1Meeting } from "@/types/f1";
import { cn } from "@/lib/utils";

const statusLabel: Record<F1Meeting["status"], string> = {
  scheduled: "À venir",
  live: "En direct",
  finished: "Terminé",
  postponed: "Reporté",
  cancelled: "Annulé",
};

export function F1MeetingCard({ meeting }: { meeting: F1Meeting }) {
  const raceDate = meeting.race_start_at ?? meeting.date_start;

  return (
    <Link
      href={`/f1/${meeting.meeting_key}`}
      className={cn(
        "block rounded-xl border border-white/10 bg-zinc-900/50 p-4 transition-colors",
        "hover:border-lime-400/30 hover:bg-zinc-900/80",
        meeting.status === "live" && "border-lime-400/40 ring-1 ring-lime-400/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading font-semibold">{meeting.meeting_name}</p>
          <p className="text-sm text-zinc-400">
            {meeting.circuit_short_name ?? meeting.location}
            {meeting.country_name ? ` · ${meeting.country_name}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            meeting.status === "live"
              ? "bg-lime-400/20 text-lime-300"
              : meeting.status === "finished"
                ? "bg-zinc-700 text-zinc-300"
                : "bg-zinc-800 text-zinc-400",
          )}
        >
          {statusLabel[meeting.status]}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        Course ·{" "}
        {format(new Date(raceDate), "EEE d MMM · HH:mm", { locale: fr })}
      </p>
    </Link>
  );
}
