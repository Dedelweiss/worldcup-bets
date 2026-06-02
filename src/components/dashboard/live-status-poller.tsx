"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { syncLiveMatchesAction } from "@/app/(app)/sync-live-action";

/** Rafraîchit les pages pour détecter les matchs passés en live. */
export function LiveStatusPoller() {
  const router = useRouter();

  useEffect(() => {
    const tick = async () => {
      await syncLiveMatchesAction();
      router.refresh();
    };
    void tick();
    const id = setInterval(() => void tick(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
