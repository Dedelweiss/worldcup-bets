import {
  OPENF1_MIN_REQUEST_GAP_MS,
} from "@/lib/f1/rate-limit";
import type {
  OpenF1Driver,
  OpenF1Meeting,
  OpenF1Position,
  OpenF1RaceControl,
  OpenF1Session,
  OpenF1SessionResult,
  OpenF1Weather,
} from "@/lib/f1/types";

const BASE_URL = "https://api.openf1.org/v1";

let lastFetchAt = 0;

async function throttleOpenF1(): Promise<void> {
  const now = Date.now();
  const wait = OPENF1_MIN_REQUEST_GAP_MS - (now - lastFetchAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastFetchAt = Date.now();
}

export async function openF1Fetch<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  await throttleOpenF1();

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenF1 ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchMeetings(year: number): Promise<OpenF1Meeting[]> {
  return openF1Fetch<OpenF1Meeting[]>("/meetings", { year });
}

export async function fetchSessions(params: {
  meeting_key?: number;
  session_name?: string;
  year?: number;
}): Promise<OpenF1Session[]> {
  return openF1Fetch<OpenF1Session[]>("/sessions", params);
}

export async function fetchDrivers(meetingKey: number): Promise<OpenF1Driver[]> {
  return openF1Fetch<OpenF1Driver[]>("/drivers", { meeting_key: meetingKey });
}

export async function fetchSessionResult(
  sessionKey: number,
): Promise<OpenF1SessionResult[]> {
  return openF1Fetch<OpenF1SessionResult[]>("/session_result", {
    session_key: sessionKey,
  });
}

export async function fetchPositions(params: {
  session_key: number;
  meeting_key?: number;
}): Promise<OpenF1Position[]> {
  return openF1Fetch<OpenF1Position[]>("/position", params);
}

export async function fetchRaceControl(
  sessionKey: number,
): Promise<OpenF1RaceControl[]> {
  return openF1Fetch<OpenF1RaceControl[]>("/race_control", {
    session_key: sessionKey,
  });
}

export async function fetchWeather(
  sessionKey: number,
): Promise<OpenF1Weather[]> {
  return openF1Fetch<OpenF1Weather[]>("/weather", { session_key: sessionKey });
}

/** Réinitialise le throttle (tests). */
export function resetOpenF1ThrottleForTests(): void {
  lastFetchAt = 0;
}
