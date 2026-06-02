"use server";

import { requireAuth } from "@/lib/auth-server";
import { syncLiveMatches } from "@/lib/matches/sync-live";

export async function syncLiveMatchesAction(): Promise<void> {
  await requireAuth();
  await syncLiveMatches({ force: true });
}
