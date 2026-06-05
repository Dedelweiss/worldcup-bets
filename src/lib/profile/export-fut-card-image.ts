import { toBlob } from "html-to-image";

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

/** Rasterise toute image (SVG, WebP, PNG…) en PNG base64 pour html-to-image. */
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

async function inlineImages(node: HTMLElement): Promise<RestoreFn> {
  const restores: RestoreFn[] = [];
  const images = Array.from(node.querySelectorAll("img"));

  for (const img of images) {
    const src = img.currentSrc || img.src;
    if (!src || src.startsWith("data:image/png")) continue;

    const isAvatar = img.hasAttribute("data-export-avatar");
    const scale = isAvatar ? 3 : 2.5;
    const width = (img.offsetWidth || img.width || (isAvatar ? 112 : 36)) * scale;
    const height = (img.offsetHeight || img.height || (isAvatar ? 112 : 36)) * scale;

    const previousSrc = img.src;
    pushRestore(restores, () => {
      img.src = previousSrc;
      img.removeAttribute("crossorigin");
    });

    try {
      const pngDataUrl = await rasterizeToPngDataUrl(src, width, height);
      img.src = pngDataUrl;
      img.removeAttribute("srcset");
      await waitForImageElement(img);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[export-fut-card] inline image failed:", src, error);
      }
    }
  }

  return () => {
    for (let i = restores.length - 1; i >= 0; i -= 1) {
      restores[i]!();
    }
  };
}

export async function captureFutCardImage(node: HTMLElement): Promise<Blob> {
  node.setAttribute("data-exporting", "true");
  const restorePatches = applyExportPatches(node);
  let restoreImages: RestoreFn | null = null;

  try {
    restoreImages = await inlineImages(node);
    await waitNextFrame(3);

    const blob = await toBlob(node, {
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: false,
      includeQueryParams: true,
      filter: (element) =>
        !(element instanceof Element && element.hasAttribute("data-export-ignore")),
    });

    if (!blob || blob.size === 0) {
      throw new Error("Empty export blob");
    }

    return blob;
  } finally {
    restoreImages?.();
    restorePatches();
    node.removeAttribute("data-exporting");
  }
}

export type FutCardShareResult = "shared" | "downloaded";

export class FutCardShareCancelledError extends Error {
  constructor() {
    super("Share cancelled");
    this.name = "AbortError";
  }
}

export async function shareOrDownloadFutCard(
  blob: Blob,
  filename: string,
): Promise<FutCardShareResult> {
  const file = new File([blob], filename, { type: "image/png" });

  if (
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: "Ma carte pronostiqueur WC2026",
        text: "Mon profil Ultimate Team — WC2026 Pool",
      });
      return "shared";
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === "AbortError" || error.name === "NotAllowedError")
      ) {
        throw new FutCardShareCancelledError();
      }
      throw error;
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return "downloaded";
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
