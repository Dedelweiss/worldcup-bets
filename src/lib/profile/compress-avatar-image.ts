import {
  AVATAR_MAX_SOURCE_BYTES,
  AVATAR_MAX_UPLOAD_BYTES,
  AVATAR_OUTPUT_PX,
  type AvatarUploadMime,
} from "@/lib/profile/avatar-upload";

export type CompressedAvatar = {
  blob: Blob;
  mime: AvatarUploadMime;
  width: number;
  height: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire cette image."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: AvatarUploadMime,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}

function supportsWebpExport(): boolean {
  try {
    const c = document.createElement("canvas");
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/**
 * Redimensionne et compresse une image pour le stockage profil.
 * Objectif : WebP/JPEG ≤ AVATAR_MAX_UPLOAD_BYTES, 256×256 max.
 */
export async function compressAvatarImage(file: File): Promise<CompressedAvatar> {
  if (file.size > AVATAR_MAX_SOURCE_BYTES) {
    throw new Error(
      `Image trop lourde (max ${Math.round(AVATAR_MAX_SOURCE_BYTES / (1024 * 1024))} Mo avant envoi).`,
    );
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Choisissez un fichier image (JPEG, PNG, WebP, etc.).");
  }

  const img = await loadImage(file);
  const size = AVATAR_OUTPUT_PX;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Compression indisponible sur ce navigateur.");
  }

  const scale = Math.max(size / img.width, size / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  const sx = (sw - size) / 2;
  const sy = (sh - size) / 2;

  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, -sx, -sy, sw, sh);

  const preferWebp = supportsWebpExport();
  const mime: AvatarUploadMime = preferWebp ? "image/webp" : "image/jpeg";
  const qualities = preferWebp
    ? [0.82, 0.72, 0.62, 0.52]
    : [0.85, 0.75, 0.65, 0.55];

  let blob: Blob | null = null;
  for (const q of qualities) {
    blob = await canvasToBlob(canvas, mime, q);
    if (blob && blob.size <= AVATAR_MAX_UPLOAD_BYTES) {
      return { blob, mime, width: size, height: size };
    }
  }

  if (!blob) {
    throw new Error("Échec de la compression de l'image.");
  }

  if (blob.size > AVATAR_MAX_UPLOAD_BYTES) {
    throw new Error(
      `Image encore trop lourde après compression (${Math.round(blob.size / 1024)} Ko). Choisissez une photo plus simple.`,
    );
  }

  return { blob, mime, width: size, height: size };
}
