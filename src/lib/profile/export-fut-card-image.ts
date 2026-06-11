import { domToBlob } from "modern-screenshot";

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .toLowerCase();
}

export function futCardExportFilename(playerName: string, ovr: number): string {
  const slug = sanitizeFilename(playerName) || "joueur";
  return `wc2026-fut-${slug}-ovr${ovr}.png`;
}

type RestoreFn = () => void;

function pushRestore(restores: RestoreFn[], fn: RestoreFn) {
  restores.push(fn);
}

function resolveFetchTarget(src: string): string {
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }

  if (src.startsWith("/")) {
    if (src.startsWith("/avatars/")) {
      return `/api/export-image?path=${encodeURIComponent(src)}`;
    }
    return src;
  }

  if (typeof window !== "undefined" && src.startsWith(window.location.origin)) {
    const path = new URL(src).pathname;
    if (path.startsWith("/avatars/")) {
      return `/api/export-image?path=${encodeURIComponent(path)}`;
    }
    return path;
  }

  return `/api/export-image?url=${encodeURIComponent(src)}`;
}

async function fetchImageBlob(src: string): Promise<Blob> {
  const response = await fetch(resolveFetchTarget(src), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status}`);
  }
  return response.blob();
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function rasterizeToPngDataUrl(
  src: string,
  width: number,
  height: number,
): Promise<string> {
  const blob = await fetchImageBlob(src);
  const dataUrl = await blobToDataUrl(blob);

  return await new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const w = Math.max(1, Math.round(width));
      const h = Math.max(1, Math.round(height));
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }

      ctx.drawImage(image, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => reject(new Error("Rasterize load failed"));
    image.src = dataUrl;
  });
}

function waitForImageElement(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
}

/** Remplace les src cross-origin par des PNG locaux (sinon canvas tainted → avatar absent). */
async function inlineImages(node: HTMLElement): Promise<RestoreFn> {
  const restores: RestoreFn[] = [];
  const images = Array.from(node.querySelectorAll("img"));

  for (const img of images) {
    const src = img.currentSrc || img.src;
    if (!src || src.startsWith("data:image/png")) continue;

    const isAvatar = img.hasAttribute("data-export-avatar");
    const scale = isAvatar ? 3 : 2.5;
    const width =
      (img.offsetWidth || img.naturalWidth || (isAvatar ? 112 : 36)) * scale;
    const height =
      (img.offsetHeight || img.naturalHeight || (isAvatar ? 112 : 36)) * scale;

    const previousSrc = img.src;
    const previousSrcset = img.getAttribute("srcset");
    pushRestore(restores, () => {
      img.src = previousSrc;
      if (previousSrcset) img.setAttribute("srcset", previousSrcset);
      else img.removeAttribute("srcset");
      img.removeAttribute("crossorigin");
    });

    try {
      const pngDataUrl = await rasterizeToPngDataUrl(src, width, height);
      img.src = pngDataUrl;
      img.removeAttribute("srcset");
      img.setAttribute("crossorigin", "anonymous");
      await waitForImageElement(img);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[export-dom] inline image failed:", src, error);
      }
    }
  }

  return () => {
    for (let i = restores.length - 1; i >= 0; i -= 1) {
      restores[i]!();
    }
  };
}

/** Proxy CORS pour modern-screenshot (avatars Supabase, drapeaux flagcdn, SVG locaux). */
async function exportFetchFn(url: string): Promise<string | false> {
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return false;
  }

  try {
    const blob = await fetchImageBlob(url);
    return await blobToDataUrl(blob);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[export-dom] fetchFn failed:", url, error);
    }
    return false;
  }
}

function waitNextFrame(frames = 1): Promise<void> {
  return new Promise((resolve) => {
    let remaining = frames;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Laisse React figer l’animation du gradient avant la capture. */
export async function waitForExportReady(): Promise<void> {
  await waitNextFrame(3);
}

function applyExportPatches(node: HTMLElement): RestoreFn {
  const restores: RestoreFn[] = [];

  const patchStyle = (
    el: HTMLElement,
    styles: Record<string, string>,
  ) => {
    const previous: Record<string, string> = {};
    for (const [property, value] of Object.entries(styles)) {
      previous[property] = el.style.getPropertyValue(property);
      el.style.setProperty(property, value);
    }
    pushRestore(restores, () => {
      for (const [property, value] of Object.entries(previous)) {
        if (value) el.style.setProperty(property, value);
        else el.style.removeProperty(property);
      }
    });
  };

  patchStyle(node, {
    "clip-path": "none",
    "border-radius": "16px",
    overflow: "hidden",
  });

  node.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    if (el.style.clipPath) {
      patchStyle(el, { "clip-path": "none", "border-radius": "14px" });
    }
  });

  node.querySelectorAll<HTMLElement>("[data-export-blur]").forEach((el) => {
    patchStyle(el, { display: "none" });
  });

  node.querySelectorAll<HTMLElement>("[data-export-animate]").forEach((el) => {
    patchStyle(el, { transform: "none", animation: "none" });
  });

  node.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const computed = getComputedStyle(el);
    const hasBlur =
      computed.backdropFilter !== "none" ||
      (computed.filter !== "none" && computed.filter.includes("blur"));

    if (hasBlur) {
      patchStyle(el, {
        "backdrop-filter": "none",
        filter: "none",
      });
    }
  });

  return () => {
    for (let i = restores.length - 1; i >= 0; i -= 1) {
      restores[i]!();
    }
  };
}

/** Détecte un PNG entièrement/noir (échec html-to-image) — pas un fond sombre légitime. */
async function isEffectivelyBlank(blob: Blob): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(blob);
    const sample = 64;
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(bitmap.width, sample);
    canvas.height = Math.min(bitmap.height, sample);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return false;
    }

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let contentPixels = 0;
    const total = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      if (a > 12 && (r > 48 || g > 48 || b > 48)) {
        contentPixels += 1;
      }
    }

    return contentPixels / total < 0.015;
  } catch {
    return false;
  }
}

/** Capture le nœud visible tel qu’affiché (pas de clone hors écran). */
export async function captureDomImage(source: HTMLElement): Promise<Blob> {
  source.setAttribute("data-exporting", "true");
  const restorePatches = applyExportPatches(source);
  let restoreImages: RestoreFn | null = null;

  try {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      await document.fonts.ready;
    }
    restoreImages = await inlineImages(source);
    await waitNextFrame(2);

    const blob = await domToBlob(source, {
      scale: 2,
      backgroundColor: "#09090b",
      timeout: 30_000,
      fetchFn: exportFetchFn,
      filter: (node) =>
        !(node instanceof Element && node.hasAttribute("data-export-ignore")),
    });

    if (!blob || blob.size === 0) {
      throw new Error("Empty export blob");
    }

    if (await isEffectivelyBlank(blob)) {
      throw new Error("Blank export capture");
    }

    return blob;
  } finally {
    restoreImages?.();
    restorePatches();
    source.removeAttribute("data-exporting");
  }
}

/** @deprecated Alias historique */
export const captureFutCardImage = captureDomImage;

export type FutCardShareResult = "shared" | "downloaded";

export class FutCardShareCancelledError extends Error {
  constructor() {
    super("Share cancelled");
    this.name = "AbortError";
  }
}

let shareInFlight = false;

function downloadBlob(blob: Blob, filename: string): FutCardShareResult {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}

export async function shareOrDownloadFutCard(
  blob: Blob,
  filename: string,
): Promise<FutCardShareResult> {
  if (shareInFlight) {
    throw new FutCardShareCancelledError();
  }

  shareInFlight = true;

  try {
    const file = new File([blob], filename, { type: "image/png" });

    if (
      typeof navigator !== "undefined" &&
      "share" in navigator &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({ files: [file] });
        return "shared";
      } catch (error) {
        if (
          error instanceof DOMException &&
          (error.name === "AbortError" || error.name === "NotAllowedError")
        ) {
          throw new FutCardShareCancelledError();
        }
        if (process.env.NODE_ENV === "development") {
          console.warn("[export] share failed, falling back to download:", error);
        }
        return downloadBlob(blob, filename);
      }
    }

    return downloadBlob(blob, filename);
  } finally {
    shareInFlight = false;
  }
}
