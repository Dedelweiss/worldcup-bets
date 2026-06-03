import { NextResponse } from "next/server";
import { hasFootballDataConfig } from "@/lib/football-data/client";
import { hasOddsApiConfig } from "@/lib/odds-api/client";
import { syncMatchProviders } from "@/lib/matches/sync-providers";

/** Cron Vercel : scores live (football-data) + cotes (odds-api) CDM 2026. */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasFootballDataConfig() && !hasOddsApiConfig()) {
    return NextResponse.json(
      { ok: false, error: "FOOTBALL_DATA_API_KEY or ODDS_API_KEY required" },
      { status: 503 },
    );
  }

  const result = await syncMatchProviders();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
