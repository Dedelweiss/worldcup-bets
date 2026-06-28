import { requireAuth } from "@/lib/auth-server";
import { F1MeetingCard } from "@/components/f1/f1-meeting-card";
import { F1NextGpHero } from "@/components/f1/f1-next-gp-hero";
import { getF1Meetings, isF1ModeEnabled } from "@/lib/f1/queries";
import { syncF1SeasonIfNeeded } from "@/lib/f1/sync-on-visit";
import { redirect } from "next/navigation";
import { F1_SEASON_YEAR } from "@/lib/sport/constants";

export const metadata = {
  title: "Calendrier F1 · WC2026 Pool",
};

export default async function F1CalendarPage() {
  await requireAuth();

  const enabled = await isF1ModeEnabled();
  if (!enabled) {
    redirect("/dashboard");
  }

  await syncF1SeasonIfNeeded();
  const meetings = await getF1Meetings(F1_SEASON_YEAR);

  const upcoming = meetings.filter((m) => m.status !== "finished");
  const past = meetings.filter((m) => m.status === "finished").reverse();
  const nextGp =
    upcoming.find((m) => m.status === "scheduled") ??
    upcoming.find((m) => m.status === "live") ??
    null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Formule 1 {F1_SEASON_YEAR}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Calendrier, championnat et paris week-end — pole, duels et top 10.
        </p>
      </header>

      <F1NextGpHero meeting={nextGp} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          À venir & en direct
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucun GP à venir.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m) => (
              <F1MeetingCard key={m.meeting_key} meeting={m} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Terminés
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.map((m) => (
              <F1MeetingCard key={m.meeting_key} meeting={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
