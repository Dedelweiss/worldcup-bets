"use client";

import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  getMutedServerSnapshot,
  getMutedSnapshot,
  setMuted,
  subscribeMuted,
} from "@/lib/cards/sound";

export function MuteToggle() {
  const muted = useSyncExternalStore(
    subscribeMuted,
    getMutedSnapshot,
    getMutedServerSnapshot,
  );

  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? "Activer le son" : "Couper le son"}
      aria-pressed={muted}
      className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/20 text-muted-foreground transition-colors hover:text-foreground"
    >
      {muted ? (
        <VolumeX className="size-4" aria-hidden />
      ) : (
        <Volume2 className="size-4" aria-hidden />
      )}
    </button>
  );
}
