import { logAppEvent } from "@/lib/logging/app-logger";
import {
  fetchDrivers,
  fetchMeetings,
  fetchSessionResult,
  fetchSessions,
} from "@/lib/f1/client";
import { assignWinnerOdds } from "@/lib/f1/odds";
import {
  dedupeDriversByNumber,
  isF1TestingMeeting,
  mapF1MeetingStatus,
  meetingToDbRow,
  parseRaceWinnerFromResults,
  pickQualiSession,
  pickRaceSession,
  sessionResultsToRaceResults,
} from "@/lib/f1/parse-meeting";
import { F1_SEASON_YEAR } from "@/lib/sport/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MatchStatus } from "@/types/database";

export interface F1SyncResult {
  meetingsUpserted: number;
  driversUpserted: number;
  settled: number;
  errors: string[];
}

let syncInFlight: Promise<F1SyncResult> | null = null;

async function upsertMeeting(
  admin: ReturnType<typeof createAdminClient>,
  row: Record<string, unknown>,
  preserveSettled: boolean,
): Promise<void> {
  if (preserveSettled) {
    const { data: existing } = await admin
      .from("f1_meetings")
      .select("settled_at, winner_driver_number")
      .eq("meeting_key", row.meeting_key as number)
      .maybeSingle();

    if (existing?.settled_at) {
      const { settled_at: _, winner_driver_number: __, status: ___, ...rest } = row;
      await admin.from("f1_meetings").update(rest).eq("meeting_key", row.meeting_key as number);
      return;
    }
  }

  await admin.from("f1_meetings").upsert(row, { onConflict: "meeting_key" });
}

export async function syncF1Season(
  year: number = F1_SEASON_YEAR,
): Promise<F1SyncResult> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = syncF1SeasonInternal(year).finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

async function syncF1SeasonInternal(year: number): Promise<F1SyncResult> {
  const result: F1SyncResult = {
    meetingsUpserted: 0,
    driversUpserted: 0,
    settled: 0,
    errors: [],
  };

  const admin = createAdminClient();

  let meetings;
  try {
    meetings = await fetchMeetings(year);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    logAppEvent({
      level: "error",
      source: "f1/sync-season",
      message: "OpenF1 fetch failed",
      metadata: { error: msg },
    });
    return result;
  }

  const raceMeetings = meetings.filter((m) => !isF1TestingMeeting(m));

  for (const meeting of raceMeetings) {
    try {
      const sessions = await fetchSessions({ meeting_key: meeting.meeting_key });
      const raceSession = pickRaceSession(sessions);
      const qualiSession = pickQualiSession(sessions);

      let winnerDriverNumber: number | null = null;
      let poleDriverNumber: number | null = null;
      let raceResults: { driver_number: number; position: number }[] | null =
        null;
      let hasOfficialResults = false;

      if (qualiSession) {
        try {
          const qualiResults = await fetchSessionResult(qualiSession.session_key);
          poleDriverNumber = parseRaceWinnerFromResults(qualiResults);
        } catch {
          // Quali pas encore terminées
        }
      }

      let status: MatchStatus = mapF1MeetingStatus({
        isCancelled: Boolean(meeting.is_cancelled),
        raceStartAt: raceSession?.date_start ?? null,
        raceEndAt: raceSession?.date_end ?? null,
        hasOfficialResults: false,
      });

      if (raceSession) {
        try {
          const sessionResults = await fetchSessionResult(raceSession.session_key);
          raceResults = sessionResultsToRaceResults(sessionResults);
          winnerDriverNumber = parseRaceWinnerFromResults(sessionResults);
          hasOfficialResults = winnerDriverNumber != null;
          status = mapF1MeetingStatus({
            isCancelled: Boolean(meeting.is_cancelled),
            raceStartAt: raceSession.date_start,
            raceEndAt: raceSession.date_end,
            hasOfficialResults,
          });
        } catch {
          // Résultats pas encore publiés
        }
      }

      const row = {
        ...meetingToDbRow(
          meeting,
          raceSession,
          status,
          winnerDriverNumber,
          raceResults,
        ),
        sessions,
        quali_session_key: qualiSession?.session_key ?? null,
        quali_start_at: qualiSession?.date_start ?? null,
        pole_driver_number: poleDriverNumber,
      };
      const { data: existing } = await admin
        .from("f1_meetings")
        .select("settled_at")
        .eq("meeting_key", meeting.meeting_key)
        .maybeSingle();

      await upsertMeeting(admin, row, true);
      result.meetingsUpserted += 1;

      if (poleDriverNumber != null) {
        try {
          await admin.rpc("settle_f1_pole_internal", {
            p_meeting_key: meeting.meeting_key,
          });
        } catch {
          // déjà réglé ou pas de paris
        }
      }

      if (raceSession) {
        const drivers = dedupeDriversByNumber(
          await fetchDrivers(meeting.meeting_key),
        );
        const odds = assignWinnerOdds(drivers.map((d) => d.driver_number));

        for (const driver of drivers) {
          await admin.from("f1_drivers").upsert(
            {
              meeting_key: meeting.meeting_key,
              driver_number: driver.driver_number,
              full_name: driver.full_name,
              name_acronym: driver.name_acronym ?? null,
              team_name: driver.team_name ?? null,
              team_colour: driver.team_colour ?? null,
              headshot_url: driver.headshot_url ?? null,
              winner_odd: odds.get(driver.driver_number) ?? 8,
            },
            { onConflict: "meeting_key,driver_number" },
          );
          result.driversUpserted += 1;
        }
      }

      if (
        winnerDriverNumber != null &&
        !existing?.settled_at &&
        status === "finished"
      ) {
        const { error: settleError } = await admin.rpc("auto_settle_f1_meeting", {
          p_meeting_key: meeting.meeting_key,
        });
        if (settleError) {
          result.errors.push(
            `settle ${meeting.meeting_key}: ${settleError.message}`,
          );
        } else {
          result.settled += 1;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${meeting.meeting_key}: ${msg}`);
    }
  }

  logAppEvent({
    level: "info",
    source: "f1/sync-season",
    message: "F1 sync completed",
    metadata: {
      year,
      meetingsUpserted: result.meetingsUpserted,
      driversUpserted: result.driversUpserted,
      settled: result.settled,
      errorCount: result.errors.length,
    },
  });

  return result;
}
