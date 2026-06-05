import { toPng } from "html-to-image";

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

export async function captureFutCardImage(node: HTMLElement): Promise<Blob> {
  node.setAttribute("data-exporting", "true");

  try {
    await waitForImages(node);
    await waitNextFrame(2);

    const dataUrl = await toPng(node, {
      pixelRatio: 3,
      cacheBust: true,
      skipAutoScale: false,
      includeQueryParams: true,
      filter: (element) => !element.hasAttribute("data-export-ignore"),
    });

    const response = await fetch(dataUrl);
    return await response.blob();
  } finally {
    node.removeAttribute("data-exporting");
  }
}

export type FutCardShareResult = "shared" | "downloaded";

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
    await navigator.share({
      files: [file],
      title: "Ma carte pronostiqueur WC2026",
      text: "Mon profil Ultimate Team — WC2026 Pool",
    });
    return "shared";
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

function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll("img"));
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  ).then(() => undefined);
}
