import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { F1DeltaDashboard } from "@/components/f1/f1-delta-dashboard";
import { F1LivePanel } from "@/components/f1/f1-live-panel";
import { F1PoleBetSlip } from "@/components/f1/f1-pole-bet-slip";
import { F1RaceOrderSlip } from "@/components/f1/f1-race-order-slip";
import { F1TeammateDuelSlip } from "@/components/f1/f1-teammate-duel-slip";
import { F1WeekendPassport } from "@/components/f1/f1-weekend-passport";
import { F1WeekendTimeline } from "@/components/f1/f1-weekend-timeline";
import { requireAuth } from "@/lib/auth-server";
import {
  getF1Drivers,
  getF1MeetingByKey,
  getUserF1BetsForMeeting,
  isF1ModeEnabled,
} from "@/lib/f1/queries";
import { getF1LiveSnapshot } from "@/lib/f1/live";
import { buildTeammateDuels } from "@/lib/f1/teammate-pairs";
import { syncF1MeetingIfNeeded } from "@/lib/f1/sync-on-visit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ meetingKey: string }>;
}) {
  const { meetingKey } = await params;
  const meeting = await getF1MeetingByKey(Number(meetingKey));
  if (!meeting) return { title: "Grand Prix · F1 Pool" };
  return { title: `${meeting.meeting_name} · F1 Pool` };
}

export default async function F1MeetingPage({
  params,
}: {
  params: Promise<{ meetingKey: string }>;
}) {
  const { meetingKey: rawKey } = await params;
  const meetingKey = Number(rawKey);
  if (Number.isNaN(meetingKey)) notFound();

  const profile = await requireAuth();
  if (!(await isF1ModeEnabled())) redirect("/dashboard");

  await syncF1MeetingIfNeeded(meetingKey);

  const meeting = await getF1MeetingByKey(meetingKey);
  if (!meeting) notFound();

  const [drivers, bets] = await Promise.all([
    getF1Drivers(meetingKey),
    getUserF1BetsForMeeting(profile.id, meetingKey),
  ]);

  const duels = buildTeammateDuels(drivers);

  const liveSnapshot =
    meeting.status === "live" && meeting.race_session_key
      ? await getF1LiveSnapshot(meeting, drivers)
      : null;

  const raceDate = meeting.race_start_at ?? meeting.date_start;
  const showPassport = meeting.status === "scheduled" || meeting.status === "live";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">{meeting.country_name}</p>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {meeting.meeting_name}
        </h1>
        <p className="text-sm text-zinc-400">
          {meeting.circuit_short_name ?? meeting.location} · Course{" "}
          {format(new Date(raceDate), "EEEE d MMMM yyyy · HH:mm", {
            locale: fr,
          })}
        </p>
      </header>

      <F1WeekendTimeline meeting={meeting} />

      {showPassport && <F1WeekendPassport bets={bets} />}

      {meeting.status === "live" && meeting.race_session_key && (
        <F1LivePanel
          meetingKey={meeting.meeting_key}
          sessionKey={meeting.race_session_key}
          circuitImage={meeting.circuit_image}
          initialSnapshot={liveSnapshot}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <F1PoleBetSlip
          meeting={meeting}
          drivers={drivers}
          existingBet={bets.pole}
        />
        <F1TeammateDuelSlip
          meeting={meeting}
          duels={duels}
          existingBet={bets.teammate}
        />
      </div>

      <F1RaceOrderSlip
        meeting={meeting}
        drivers={drivers}
        existingBet={bets.raceOrder}
        boostsAvailable={profile.boosts_available ?? 0}
      />

      <F1DeltaDashboard
        meeting={meeting}
        drivers={drivers}
        bet={bets.raceOrder}
      />
    </div>
  );
}
