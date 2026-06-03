"use client";

import Image from "next/image";
import {
  DEFAULT_AVATAR_ID,
  PROFILE_AVATARS,
  getAvatarUrl,
} from "@/lib/profile/avatars";
import { cn } from "@/lib/utils";

interface SignupAvatarPickerProps {
  value: string;
  onChange: (avatarId: string) => void;
}

export function SignupAvatarPicker({ value, onChange }: SignupAvatarPickerProps) {
  const selected = value || DEFAULT_AVATAR_ID;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Avatar</p>
      <div
        className="grid grid-cols-4 gap-2"
        role="radiogroup"
        aria-label="Choisir un avatar"
      >
        {PROFILE_AVATARS.map((avatar) => {
          const active = selected === avatar.id;
          const src = getAvatarUrl(avatar.id)!;
          return (
            <button
              key={avatar.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={avatar.label}
              onClick={() => onChange(avatar.id)}
              className={cn(
                "rounded-xl border p-1.5 transition-colors",
                active
                  ? "border-lime-400 bg-lime-400/10 ring-1 ring-lime-400/40"
                  : "border-white/10 hover:border-white/25",
              )}
            >
              <Image
                src={src}
                alt=""
                width={40}
                height={40}
                className="mx-auto size-10 rounded-full"
                unoptimized
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
