import { NextResponse } from "next/server";
import { generateAndSaveMatchSummary } from "@/lib/ai/generate-match-summary";
import { getProfile } from "@/lib/auth-server";

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let matchId: number;
  try {
    const body = (await request.json()) as { matchId?: number };
    matchId = Number(body.matchId);
    if (!Number.isFinite(matchId) || matchId <= 0) {
      return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await generateAndSaveMatchSummary(matchId);

  if (!result.success) {
    const status = result.error.includes("déjà") ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ summary: result.summary });
}
