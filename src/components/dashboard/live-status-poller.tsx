"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Rafraîchit le dashboard pour détecter les matchs passés en live */
export function LiveStatusPoller() {
  const router = useRouter();

  useEffect(() => {
    const tick = () => router.refresh();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
