"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { F1Driver } from "@/types/f1";

interface ShareF1GridButtonProps {
  meetingName: string;
  order: number[];
  drivers: F1Driver[];
}

export function ShareF1GridButton({
  meetingName,
  order,
  drivers,
}: ShareF1GridButtonProps) {
  if (order.length !== 10) return null;

  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

  async function share() {
    const lines = order.map((num, i) => {
      const d = driverMap.get(num);
      return `${i + 1}. ${d?.full_name ?? `#${num}`} (${d?.team_name ?? "?"})`;
    });

    const text = `🏎️ Mon top 10 — ${meetingName}\n\n${lines.join("\n")}\n\nvia WC2026 Pool F1`;

    if (navigator.share) {
      try {
        await navigator.share({ title: meetingName, text });
        return;
      } catch {
        // fallback clipboard
      }
    }

    await navigator.clipboard.writeText(text);
    toast.success("Grille copiée dans le presse-papier");
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={share}>
      <Share2 className="size-4" aria-hidden />
      Partager ma grille
    </Button>
  );
}
