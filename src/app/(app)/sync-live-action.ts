"use server";

import { syncLiveMatches } from "@/lib/matches/sync-live";

export async function syncLiveMatchesAction(): Promise<void> {
  await syncLiveMatches({ force: true });
}
