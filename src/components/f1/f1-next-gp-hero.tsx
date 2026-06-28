import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { buttonVariants } from "@/components/ui/button";
import type { F1Meeting } from "@/types/f1";
import { cn } from "@/lib/utils";

export function F1NextGpHero({ meeting }: { meeting: F1Meeting | null }) {
  if (!meeting) return null;

  const raceAt = meeting.race_start_at ?? meeting.date_start;
  const countdown = formatDistanceToNow(new Date(raceAt), {
    locale: fr,
    addSuffix: true,
  });

  return (
    <section className="relative overflow-hidden rounded-2xl border border-lime-400/20 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-5">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, transparent, transparent 8px, #a3e635 8px, #a3e635 9px)",
        }}
      />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-widest text-lime-400">
          Prochain GP
        </p>
        <h2 className="mt-1 font-heading text-xl font-bold">
          {meeting.meeting_name}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {meeting.circuit_short_name} · Course {countdown}
        </p>
        <Link
          href={`/f1/${meeting.meeting_key}`}
          className={cn(buttonVariants({ size: "sm" }), "mt-4")}
        >
          Pit Wall — pronostics
        </Link>
      </div>
    </section>
  );
}
