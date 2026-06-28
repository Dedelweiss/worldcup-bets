"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { adminToggleF1ModeAction } from "@/app/admin/f1/actions";

export function F1ModeToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-zinc-400">Mode F1</span>
      <Switch
        checked={enabled}
        disabled={pending}
        onCheckedChange={(checked) => {
          startTransition(async () => {
            try {
              await adminToggleF1ModeAction(checked);
              toast.success(checked ? "F1 activé" : "F1 désactivé");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erreur");
            }
          });
        }}
      />
    </label>
  );
}
