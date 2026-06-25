import { getSupabaseUrl } from "@/lib/supabase/env";
import type { CardImageJobRow } from "@/lib/cards/card-image-types";

export const CARD_IMAGES_BUCKET = "card-images";

export function cardImageStoragePath(cardCode: string): string {
  return `${cardCode}.webp`;
}

export function cardImagePreviewPath(jobId: string): string {
  return `previews/${jobId}.webp`;
}

export function cardImagePublicUrl(
  storagePath: string | null | undefined,
): string | null {
  if (!storagePath?.trim()) return null;
  const base = getSupabaseUrl();
  if (!base) return null;
  return `${base}/storage/v1/object/public/${CARD_IMAGES_BUCKET}/${storagePath}`;
}

export function resolveJobPreviewUrl(job: CardImageJobRow | null): string | null {
  if (!job) return null;
  return (
    cardImagePublicUrl(job.preview_storage_path) ?? job.preview_url ?? null
  );
}
