/** Bucket Supabase Storage pour photos de profil. */
export const PROFILE_AVATAR_BUCKET = "profile-avatars";

/** Fichier source max avant compression (évite de charger des RAW/PNG énormes en mémoire). */
export const AVATAR_MAX_SOURCE_BYTES = 5 * 1024 * 1024;

/** Taille max envoyée à Supabase après compression. */
export const AVATAR_MAX_UPLOAD_BYTES = 150 * 1024;

/** Côté rendu (compression canvas). */
export const AVATAR_OUTPUT_PX = 256;

export function profileAvatarStorageFile(mime: AvatarUploadMime): string {
  return mime === "image/webp" ? "avatar.webp" : "avatar.jpg";
}

export const CUSTOM_AVATAR_ID = "custom";

const SUPABASE_AVATAR_PATH_RE =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/profile-avatars\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/avatar\.(webp|jpe?g)$/i;

export function profileAvatarStoragePath(
  userId: string,
  mime: AvatarUploadMime,
): string {
  return `${userId}/${profileAvatarStorageFile(mime)}`;
}

export function parseProfileAvatarUserId(publicUrl: string): string | null {
  const match = publicUrl.trim().match(SUPABASE_AVATAR_PATH_RE);
  return match?.[1] ?? null;
}

export function isAllowedCustomAvatarUrl(
  publicUrl: string,
  userId: string,
): boolean {
  return parseProfileAvatarUserId(publicUrl) === userId;
}

export const AVATAR_UPLOAD_MIME_TYPES = ["image/webp", "image/jpeg"] as const;

export type AvatarUploadMime = (typeof AVATAR_UPLOAD_MIME_TYPES)[number];

export function isAllowedUploadMime(mime: string): mime is AvatarUploadMime {
  return (AVATAR_UPLOAD_MIME_TYPES as readonly string[]).includes(mime);
}
