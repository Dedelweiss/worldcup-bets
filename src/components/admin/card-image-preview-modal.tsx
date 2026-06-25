"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CardImageListRow } from "@/lib/cards/card-image-types";
import {
  commitCardImageJobAction,
  regenerateCardImageJobAction,
} from "@/app/admin/card-images/actions";

export function CardImagePreviewModal({
  row,
  previewUrl,
  open,
  onClose,
  onUpdated,
}: {
  row: CardImageListRow;
  previewUrl: string;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState<"save" | "regen" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted || !open || !row.job) return null;

  async function handleSave() {
    if (!row.job) return;
    setLoading("save");
    setError(null);
    const res = await commitCardImageJobAction(row.job.id);
    setLoading(null);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onUpdated();
    onClose();
  }

  async function handleRegenerate() {
    if (!row.job) return;
    setLoading("regen");
    setError(null);
    const res = await regenerateCardImageJobAction(row.id, row.job.id);
    setLoading(null);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onUpdated();
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-image-preview-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Fermer"
        disabled={loading != null}
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="border-b border-white/10 px-5 py-4">
          <h2
            id="card-image-preview-title"
            className="font-heading text-lg font-semibold"
          >
            Preview — {row.name}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.code} · validez pour publier en WebP sur le CDN
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[240px] overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Preview ${row.name}`}
              className="h-full w-full object-cover"
            />
          </div>

          <details className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">
              Prompt Leonardo
            </summary>
            <p className="mt-2 leading-relaxed">{row.job.prompt}</p>
          </details>

          {error && (
            <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 p-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={loading != null}
            onClick={onClose}
          >
            Fermer
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading != null}
            onClick={() => void handleRegenerate()}
          >
            {loading === "regen" ? "Relance…" : "Regénérer"}
          </Button>
          <Button
            type="button"
            className={cn(
              "bg-lime-400 font-semibold text-black hover:bg-lime-300",
            )}
            disabled={loading != null}
            onClick={() => void handleSave()}
          >
            {loading === "save" ? "Enregistrement…" : "Valider & publier"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
