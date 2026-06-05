"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uploadCustomAvatarAction } from "@/app/(app)/profile/actions";
import { AVATAR_MAX_UPLOAD_BYTES } from "@/lib/profile/avatar-upload";
import { compressAvatarImage } from "@/lib/profile/compress-avatar-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

interface AvatarUploadFieldProps {
  currentCustomUrl?: string | null;
  isActive?: boolean;
  legacyHint?: string;
}

export function AvatarUploadField({
  currentCustomUrl,
  isActive = false,
  legacyHint,
}: AvatarUploadFieldProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [pendingMime, setPendingMime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const displayUrl = previewUrl ?? currentCustomUrl ?? null;

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setError(null);
    setMessage(null);

    if (!file) return;

    setCompressing(true);
    try {
      const { blob, mime } = await compressAvatarImage(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPendingBlob(blob);
      setPendingMime(mime);
    } catch (err) {
      setPendingBlob(null);
      setPendingMime(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setError(err instanceof Error ? err.message : "Erreur de compression.");
    } finally {
      setCompressing(false);
    }
  }

  async function handleUpload() {
    if (!pendingBlob || !pendingMime) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const ext = pendingMime === "image/webp" ? "webp" : "jpg";
    const formData = new FormData();
    formData.append(
      "avatar",
      new File([pendingBlob], `avatar.${ext}`, { type: pendingMime }),
    );

    const result = await uploadCustomAvatarAction(formData);
    if (!result.success) {
      setError(result.error);
    } else {
      setMessage("Photo de profil enregistrée.");
      setPendingBlob(null);
      setPendingMime(null);
      router.refresh();
    }
    setLoading(false);
  }

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingBlob(null);
    setPendingMime(null);
    setError(null);
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border bg-white/[0.03] p-4 transition-colors",
        isActive
          ? "border-lime-400 bg-lime-400/10 ring-1 ring-lime-400/50"
          : "border-white/10",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "relative size-16 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-900",
            !displayUrl && "flex items-center justify-center",
          )}
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Aperçu avatar"
              className="size-full object-cover"
              referrerPolicy="no-referrer"
              decoding="async"
            />
          ) : (
            <Upload className="size-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">Photo personnelle</p>
          <p className="text-xs text-muted-foreground">
            Image recadrée en carré, compressée automatiquement (max{" "}
            {Math.round(AVATAR_MAX_UPLOAD_BYTES / 1024)} Ko, 256×256 px).
          </p>
          {legacyHint && (
            <p className="text-xs text-lime-300/90">{legacyHint}</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/*"
            className="sr-only"
            onChange={onFileChange}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={compressing || loading}
              onClick={() => inputRef.current?.click()}
            >
              {compressing ? "Compression…" : "Choisir une image"}
            </Button>
            {pendingBlob && (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={loading}
                  onClick={handleUpload}
                >
                  {loading ? "Envoi…" : "Enregistrer la photo"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={clearPreview}
                >
                  Annuler
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-primary">{message}</p>}
    </div>
  );
}
