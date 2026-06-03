import {
  CUSTOM_AVATAR_ID,
  isAllowedCustomAvatarUrl,
} from "@/lib/profile/avatar-upload";

export interface ProfileAvatar {
  id: string;
  label: string;
}

export { CUSTOM_AVATAR_ID };

/** Avatars prédéfinis (fichiers dans /public/avatars/). */
export const PROFILE_AVATARS: ProfileAvatar[] = [
  { id: "lion", label: "Lion" },
  { id: "eagle", label: "Aigle" },
  { id: "wolf", label: "Loup" },
  { id: "bear", label: "Ours" },
  { id: "fox", label: "Renard" },
  { id: "tiger", label: "Tigre" },
  { id: "owl", label: "Hibou" },
  { id: "penguin", label: "Pingouin" },
];

export const DEFAULT_AVATAR_ID = PROFILE_AVATARS[0]!.id;

const AVATAR_IDS = new Set(PROFILE_AVATARS.map((a) => a.id));

export function isValidAvatarId(id: string): boolean {
  return AVATAR_IDS.has(id);
}

export function getAvatarUrl(avatarId: string | null | undefined): string | null {
  if (!avatarId || !isValidAvatarId(avatarId)) return null;
  return `/avatars/${avatarId}.svg`;
}

export function resolveAvatarUrl(
  profile: {
    avatar_id?: string | null;
    avatar_url?: string | null;
  },
  userId?: string,
): string | null {
  if (profile.avatar_id === CUSTOM_AVATAR_ID) {
    const url = profile.avatar_url?.trim();
    if (!url) return null;
    if (userId && !isAllowedCustomAvatarUrl(url, userId)) return null;
    if (!userId && !url.includes("/profile-avatars/")) return null;
    return url;
  }
  const fromId = getAvatarUrl(profile.avatar_id);
  if (fromId) return fromId;
  const url = profile.avatar_url?.trim();
  if (url?.startsWith("/avatars/")) return url;
  return null;
}
