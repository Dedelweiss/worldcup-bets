import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { CARD_IMAGES_BUCKET } from "@/lib/cards/card-image-urls";

/** Télécharge une image distante, convertit en WebP et l'upload dans le bucket. */
export async function uploadCardImageWebp(
  supabase: SupabaseClient,
  storagePath: string,
  sourceUrl: string,
): Promise<void> {
  const imageRes = await fetch(sourceUrl, { cache: "no-store" });
  if (!imageRes.ok) {
    throw new Error(`Impossible de télécharger l'image (${imageRes.status})`);
  }

  const inputBuffer = Buffer.from(await imageRes.arrayBuffer());
  let webpBuffer: Buffer;

  try {
    const sharp = (await import("sharp")).default;
    webpBuffer = await sharp(inputBuffer)
      .resize(768, 1024, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    webpBuffer = inputBuffer;
  }

  const { error } = await supabase.storage
    .from(CARD_IMAGES_BUCKET)
    .upload(storagePath, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeCardImageIfExists(
  supabase: SupabaseClient,
  storagePath: string | null | undefined,
): Promise<void> {
  if (!storagePath?.trim()) return;
  await supabase.storage.from(CARD_IMAGES_BUCKET).remove([storagePath]);
}
