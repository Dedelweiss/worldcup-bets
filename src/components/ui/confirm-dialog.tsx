"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  loading = false,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) onCancel();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Fermer"
        disabled={loading}
        onClick={onCancel}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl sm:p-6">
        <h2
          id="confirm-dialog-title"
          className="font-heading text-lg font-semibold text-foreground"
        >
          {title}
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
          {description}
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full touch-manipulation sm:w-auto"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            className={cn(
              "min-h-11 w-full touch-manipulation sm:w-auto",
              !destructive &&
                "bg-lime-400 font-semibold text-black hover:bg-lime-300",
            )}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "En cours…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmActionButtonProps {
  children: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmActionButton({
  children,
  title,
  description,
  confirmLabel,
  destructive = false,
  disabled = false,
  className,
  onConfirm,
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || loading}
        className={cn("min-h-11 touch-manipulation", className)}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>

      <ConfirmDialog
        open={open}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        destructive={destructive}
        loading={loading}
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          if (!loading) setOpen(false);
        }}
      />
    </>
  );
}
