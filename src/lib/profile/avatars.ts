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

/** Photo hébergée ailleurs (ex. compte Google legacy). */
export function isExternalProfilePhotoUrl(
  url: string | null | undefined,
): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/avatars/")) return false;
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

/** Photo perso active (upload Supabase ou URL legacy), pas un avatar prédéfini. */
export function isPersonalPhotoActive(
  avatarId: string | null | undefined,
  avatarUrl: string | null | undefined,
): boolean {
  if (avatarId === CUSTOM_AVATAR_ID) return Boolean(avatarUrl?.trim());
  if (avatarId && isValidAvatarId(avatarId)) return false;
  return isExternalProfilePhotoUrl(avatarUrl);
}

/** Avatar prédéfini réellement actif, ou null si photo perso / legacy. */
export function getActivePresetAvatarId(
  avatarId: string | null | undefined,
  avatarUrl: string | null | undefined,
): string | null {
  if (isPersonalPhotoActive(avatarId, avatarUrl)) return null;
  if (avatarId && isValidAvatarId(avatarId)) return avatarId;
  return null;
}

export function resolveAvatarUrl(
  profile: {
    avatar_id?: string | null;
    avatar_url?: string | null;
  },
  userId?: string,
): string | null {
  const avatarId = profile.avatar_id?.trim() ?? "";
  const url = profile.avatar_url?.trim() ?? "";

  if (avatarId === CUSTOM_AVATAR_ID) {
    if (!url) return null;
    if (userId && !isAllowedCustomAvatarUrl(url, userId)) return null;
    if (!userId && !url.includes("/profile-avatars/")) return null;
    return url;
  }

  if (avatarId && isValidAvatarId(avatarId)) {
    return getAvatarUrl(avatarId);
  }

  if (!url) return null;
  if (url.startsWith("/avatars/")) return url;
  if (isExternalProfilePhotoUrl(url)) return url;
  if (url.includes("/profile-avatars/")) {
    if (userId && !isAllowedCustomAvatarUrl(url, userId)) return null;
    return url;
  }

  return url;
}
