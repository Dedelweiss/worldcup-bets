"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Megaphone } from "lucide-react";
import { setDashboardAnnouncementAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface DashboardAnnouncementPanelProps {
  enabled: boolean;
  message: string;
}

export function DashboardAnnouncementPanel({
  enabled: initialEnabled,
  message: initialMessage,
}: DashboardAnnouncementPanelProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback(null);

    const result = await setDashboardAnnouncementAction(enabled, message);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setFeedback(
      enabled && message.trim()
        ? "Annonce publiée sur le dashboard."
        : "Annonce désactivée sur le dashboard.",
    );
    router.refresh();
  }

  return (
    <Card className="border-fuchsia-500/25">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="size-4 text-fuchsia-400" aria-hidden />
          Annonce dashboard
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Message visible en haut du tableau de bord pour tous les joueurs.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
            <Label htmlFor="announcement-enabled" className="cursor-pointer">
              Afficher l&apos;annonce
            </Label>
            <Switch
              id="announcement-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcement-message">Message</Label>
            <textarea
              id="announcement-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Ex. : Pensez à valider vos pronos avant le coup d'envoi du match de ce soir !"
              className={cn(
                "border-input bg-background ring-offset-background placeholder:text-muted-foreground",
                "focus-visible:ring-ring flex w-full resize-y rounded-md border px-3 py-2 text-sm",
                "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            />
            <p className="text-right text-[11px] tabular-nums text-muted-foreground">
              {message.length}/500
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {feedback && (
            <p className="text-sm text-lime-400" role="status">
              {feedback}
            </p>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? "Enregistrement…" : "Enregistrer l'annonce"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
