"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminSyncF1Action } from "@/app/admin/f1/actions";

export function F1SyncButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const result = await adminSyncF1Action();
            toast.success(
              `Sync OK — ${result.meetingsUpserted} GP, ${result.settled} réglés`,
            );
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Échec de la synchronisation",
            );
          }
        });
      }}
    >
      {pending ? "Sync…" : "Sync OpenF1"}
    </Button>
  );
}
