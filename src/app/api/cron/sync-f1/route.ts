import { NextResponse } from "next/server";
import { syncF1Season } from "@/lib/f1/sync-season";
import { F1_SEASON_YEAR } from "@/lib/sport/constants";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncF1Season(F1_SEASON_YEAR);
  return NextResponse.json(result);
}
