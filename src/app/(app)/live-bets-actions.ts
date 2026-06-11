"use server";

import { requireAuth } from "@/lib/auth-server";
import {
  getLiveBetsSnapshot,
  type LiveBetsSnapshot,
} from "@/lib/live-bets/live-bet-snapshot";
import { getUserBadgeCollection } from "@/lib/profile/user-badges";
import type { PlayerBadge } from "@/lib/badges";

export async function fetchLiveBetsSnapshotAction(): Promise<LiveBetsSnapshot> {
  const profile = await requireAuth();
  return getLiveBetsSnapshot(profile.id);
}

export async function fetchUnlockedBadgesAction(): Promise<PlayerBadge[]> {
  const profile = await requireAuth();
  const collection = await getUserBadgeCollection(profile.id);
  return collection.unlocked;
}
