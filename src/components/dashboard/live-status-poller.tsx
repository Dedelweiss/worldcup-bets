"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { syncLiveMatchesAction } from "@/app/(app)/sync-live-action";
import { refreshPreservingScroll } from "@/lib/navigation/refresh-preserving-scroll";

const POLL_INTERVAL_MS = 30_000;

/** Rafraîchit les pages pour détecter les matchs passés en live. */
export function LiveStatusPoller() {
  const router = useRouter();

  useEffect(() => {
    const tick = async () => {
      await syncLiveMatchesAction();
      refreshPreservingScroll(router);
    };

    // Pas de refresh immédiat : la page vient d'être rendue côté serveur.
    const id = window.setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [router]);

  return null;
}
