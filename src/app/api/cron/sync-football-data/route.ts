import { NextResponse } from "next/server";
import { hasFootballDataConfig } from "@/lib/football-data/client";
import { syncFootballDataWc2026 } from "@/lib/football-data/sync-wc2026";

/** Cron Vercel : scores live (football-data) — cotes via admin uniquement. */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasFootballDataConfig()) {
    return NextResponse.json(
      { ok: false, error: "FOOTBALL_DATA_API_KEY required" },
      { status: 503 },
    );
  }

  const result = await syncFootballDataWc2026({ skipOdds: true });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
