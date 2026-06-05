"use client";

import { useState } from "react";
import { Megaphone, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SiteInvitePanelProps {
  signupUrl: string;
  inviteMessage: string;
}

function canUseNativeShare(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    typeof navigator.share === "function"
  );
}

export function SiteInvitePanel({
  signupUrl,
  inviteMessage,
}: SiteInvitePanelProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setLoading(true);
    setError(null);
    setFeedback(null);

    if (canUseNativeShare()) {
      try {
        await navigator.share({
          title: "WC2026 Pool",
          text: inviteMessage,
        });
        setLoading(false);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setLoading(false);
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(inviteMessage);
      setFeedback("Message copié — collez-le où vous voulez.");
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setError("Impossible de partager ou copier le message.");
    }

    setLoading(false);
  }

  return (
    <Card className="border-lime-400/25">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="size-4 text-lime-400" aria-hidden />
          Invitation au pool
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          QR code ou partage du message d&apos;invitation vers le site.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="shrink-0 rounded-xl bg-white p-3">
          <QRCodeSVG
            value={signupUrl}
            size={148}
            level="M"
            role="img"
            aria-label={`QR code vers ${signupUrl}`}
          />
        </div>

        <div className="flex w-full flex-1 flex-col gap-3 sm:pt-2">
          <p className="text-center text-xs text-muted-foreground break-all sm:text-left">
            {signupUrl}
          </p>
          <Button
            type="button"
            onClick={handleShare}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <Share2 className="size-4" aria-hidden />
            {loading ? "…" : "Partager l'invitation"}
          </Button>

          {feedback && (
            <p className="text-sm text-lime-400" role="status">
              {feedback}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
