import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth-server";
import { getPlayerFutCardData } from "@/lib/profile/get-player-fut-card";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { userId } = await context.params;
  if (!userId?.trim()) {
    return NextResponse.json({ error: "Joueur invalide" }, { status: 400 });
  }

  const data = await getPlayerFutCardData(userId, profile.id);
  if (!data) {
    return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
  }

  return NextResponse.json(data);
}
