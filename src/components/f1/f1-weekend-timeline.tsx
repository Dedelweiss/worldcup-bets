"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { F1Meeting, F1MeetingSession } from "@/types/f1";
import { cn } from "@/lib/utils";

function sessionStatus(
  session: F1MeetingSession,
  now: Date,
): "done" | "live" | "upcoming" {
  const start = new Date(session.date_start);
  const end = new Date(session.date_end);
  if (now > end) return "done";
  if (now >= start && now <= end) return "live";
  return "upcoming";
}

const statusStyles = {
  done: "border-zinc-700 bg-zinc-900/60 text-zinc-400",
  live: "border-lime-400/50 bg-lime-400/10 text-lime-300",
  upcoming: "border-white/10 bg-zinc-950/50 text-zinc-300",
};

export function F1WeekendTimeline({ meeting }: { meeting: F1Meeting }) {
  const sessions = meeting.sessions ?? [];
  const now = new Date();

  const mainSessions = sessions.filter((s) =>
    ["Practice 1", "Practice 2", "Practice 3", "Qualifying", "Sprint", "Race"].includes(
      s.session_name,
    ),
  );

  if (mainSessions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Week-end
      </h2>
      <ol className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {mainSessions.map((session) => {
          const st = sessionStatus(session, now);
          return (
            <li
              key={session.session_key}
              className={cn(
                "min-w-[140px] shrink-0 rounded-lg border px-3 py-2",
                statusStyles[st],
              )}
            >
              <p className="text-xs font-medium">{session.session_name}</p>
              <p className="mt-0.5 text-[10px] tabular-nums opacity-80">
                {format(new Date(session.date_start), "EEE HH:mm", {
                  locale: fr,
                })}
              </p>
              {st === "live" && (
                <span className="mt-1 inline-block text-[10px] font-semibold text-lime-400">
                  LIVE
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
