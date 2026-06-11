"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Radio } from "lucide-react";
import { toast } from "sonner";
import { fetchLiveBetsSnapshotAction } from "@/app/(app)/live-bets-actions";
import { hasSupabaseConfig } from "@/lib/supabase/env";

const POLL_INTERVAL_MS = 30_000;
const STORAGE_KEY = "wc_live_match_notified_v1";

function readNotifiedIds(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is number => typeof id === "number"));
  } catch {
    return new Set();
  }
}

function writeNotifiedIds(ids: Set<number>) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/** Toast quand un de vos paris passe sur un match en direct. */
export function LiveMatchNotifier() {
  const notifiedRef = useRef<Set<number>>(readNotifiedIds());
  const knownLiveRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!hasSupabaseConfig) return;

    async function poll() {
      const snapshot = await fetchLiveBetsSnapshotAction();
      const liveIds = snapshot.items
        .filter((item) => item.matchStatus === "live")
        .map((item) => item.matchId);

      const liveSet = new Set(liveIds);

      for (const item of snapshot.items) {
        if (item.matchStatus !== "live") continue;
        if (knownLiveRef.current.has(item.matchId)) continue;
        if (notifiedRef.current.has(item.matchId)) continue;

        notifiedRef.current.add(item.matchId);
        writeNotifiedIds(notifiedRef.current);

        toast(
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Radio className="size-3.5 text-lime-400" aria-hidden />
              Match en direct
            </span>
            <span className="text-sm opacity-90">{item.label}</span>
            <Link
              href={`/matches/${item.matchId}#paris-fun`}
              className="text-xs font-medium text-lime-400 underline-offset-2 hover:underline"
            >
              Suivre le match →
            </Link>
          </div>,
          { duration: 12_000 },
        );
      }

      knownLiveRef.current = liveSet;
    }

    void poll();
    const id = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
