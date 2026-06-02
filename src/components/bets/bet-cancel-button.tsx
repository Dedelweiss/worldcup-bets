"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import { cancelBetAction } from "@/app/(app)/bets/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BetCancelButtonProps {
  betId: string;
  matchId: number;
  className?: string;
}

export function BetCancelButton({
  betId,
  matchId,
  className,
}: BetCancelButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (
      !confirm(
        "Annuler ce pari ? Vous pourrez en placer un autre tant que le match n'a pas commencé.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await cancelBetAction(betId, matchId);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={handleCancel}
        className="w-full gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="size-3.5" aria-hidden />
        {loading ? "Annulation…" : "Annuler le pari"}
      </Button>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
