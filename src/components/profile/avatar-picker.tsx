"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateAvatarAction } from "@/app/(app)/profile/actions";
import { AvatarUploadField } from "@/components/profile/avatar-upload-field";
import {
  CUSTOM_AVATAR_ID,
  getActivePresetAvatarId,
  getAvatarUrl,
  isPersonalPhotoActive,
  PROFILE_AVATARS,
} from "@/lib/profile/avatars";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AvatarPickerProps {
  currentAvatarId: string | null;
  currentAvatarUrl?: string | null;
}

export function AvatarPicker({
  currentAvatarId,
  currentAvatarUrl,
}: AvatarPickerProps) {
  const router = useRouter();
  const hasPersonalPhoto = isPersonalPhotoActive(
    currentAvatarId,
    currentAvatarUrl,
  );
  const isLegacyPhoto =
    hasPersonalPhoto && currentAvatarId !== CUSTOM_AVATAR_ID;
  const savedPresetId = getActivePresetAvatarId(
    currentAvatarId,
    currentAvatarUrl,
  );
  const [selected, setSelected] = useState<string | null>(savedPresetId);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!selected) return;

    const result = await updateAvatarAction(selected);
    if (!result.success) {
      setError(result.error);
    } else {
      setSelected(result.avatarId);
      setMessage("Avatar enregistré.");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mon avatar</CardTitle>
        <CardDescription>
          Photo personnelle (compressée) ou avatar parmi la liste ci-dessous.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AvatarUploadField
          currentCustomUrl={hasPersonalPhoto ? currentAvatarUrl : null}
          isActive={hasPersonalPhoto}
          legacyHint={
            isLegacyPhoto
              ? "Photo conservée depuis votre ancien compte Google. Uploadez une nouvelle image ou choisissez un avatar ci-dessous."
              : undefined
          }
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            Avatars prédéfinis
          </p>
          <div
            className="grid grid-cols-4 gap-2 sm:grid-cols-4"
            role="radiogroup"
            aria-label="Choisir un avatar prédéfini"
          >
            {PROFILE_AVATARS.map((avatar) => {
              const active = !hasPersonalPhoto && selected === avatar.id;
              const src = getAvatarUrl(avatar.id)!;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={avatar.label}
                  onClick={() => setSelected(avatar.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-2 transition-colors",
                    active
                      ? "border-lime-400 bg-lime-400/10 ring-1 ring-lime-400/50"
                      : "border-white/10 bg-white/5 hover:border-white/20",
                  )}
                >
                  <Image
                    src={src}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 rounded-full"
                    unoptimized
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {avatar.label}
                  </span>
                </button>
              );
            })}
          </div>
          <Button
            type="submit"
            disabled={loading || !selected || selected === savedPresetId}
          >
            {loading ? "…" : "Utiliser cet avatar"}
          </Button>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {message && <p className="text-sm text-primary">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
