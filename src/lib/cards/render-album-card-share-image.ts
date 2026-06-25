import { cardDisplayIcon, normalizeCategory } from "@/lib/cards/card-categories";
import { cardImagePublicUrl } from "@/lib/cards/card-image-urls";
import { flagEmoji, RARITY_LABEL } from "@/lib/cards/styles";
import { getNationColors } from "@/lib/cards/nations";
import type { AlbumCard, CardRarity } from "@/lib/cards/types";

/** Sortie haute résolution, ratio 3:4 (autocollant + cadre). */
const OUT_W = 768;
const OUT_H = 1024;

const RARITY_EXPORT: Record<
  CardRarity,
  { border: string; glow: string; surface: [string, string, string] }
> = {
  commune: {
    border: "rgba(113,113,122,0.55)",
    glow: "rgba(0,0,0,0)",
    surface: ["#2a3140", "#1a1f2b", "#151922"],
  },
  rare: {
    border: "rgba(56,189,248,0.7)",
    glow: "rgba(56,189,248,0.55)",
    surface: ["#1e3a5f", "#0f2744", "#1a4a7a"],
  },
  epique: {
    border: "rgba(232,121,249,0.75)",
    glow: "rgba(217,70,239,0.6)",
    surface: ["#3b1f5c", "#1a1030", "#5b21b6"],
  },
  legendaire: {
    border: "rgba(252,211,77,0.85)",
    glow: "rgba(252,211,77,0.65)",
    surface: ["#4a3412", "#1c1408", "#7c5c16"],
  },
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function resolveExportImageUrl(src: string): string {
  if (src.startsWith("/")) return src;
  if (typeof window !== "undefined" && src.startsWith(window.location.origin)) {
    const parsed = new URL(src);
    return parsed.pathname + parsed.search;
  }
  return `/api/export-image?url=${encodeURIComponent(src)}`;
}

async function loadCardArtwork(imagePath: string): Promise<HTMLImageElement | null> {
  const url = cardImagePublicUrl(imagePath);
  if (!url) return null;

  try {
    const response = await fetch(resolveExportImageUrl(url), { cache: "no-store" });
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      img.src = objectUrl;
    });
  } catch {
    return null;
  }
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const boxRatio = w / h;
  const imgRatio = img.naturalWidth / img.naturalHeight;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (imgRatio > boxRatio) {
    sw = img.naturalHeight * boxRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / boxRatio;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, "rgba(0,0,0,0.15)");
  grad.addColorStop(0.45, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

function drawShineOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rarity: CardRarity,
) {
  if (rarity === "commune") return;

  if (rarity === "rare") {
    const shine = ctx.createLinearGradient(x, y, x + w, y);
    shine.addColorStop(0, "rgba(255,255,255,0)");
    shine.addColorStop(0.48, "rgba(255,255,255,0.22)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shine;
    ctx.fillRect(x, y, w, h);
    return;
  }

  const holo = ctx.createLinearGradient(x, y, x + w, y + h);
  holo.addColorStop(0, "rgba(255,0,153,0.22)");
  holo.addColorStop(0.35, "rgba(0,225,255,0.2)");
  holo.addColorStop(0.65, "rgba(180,255,0,0.18)");
  holo.addColorStop(1, "rgba(255,170,0,0.22)");
  ctx.fillStyle = holo;
  ctx.fillRect(x, y, w, h);
}

function drawNumberBadge(
  ctx: CanvasRenderingContext2D,
  number: number,
  x: number,
  y: number,
) {
  const label = String(number);
  ctx.font = "700 22px system-ui, -apple-system, sans-serif";
  const padX = 12;
  const padY = 8;
  const textW = ctx.measureText(label).width;
  const badgeW = textW + padX * 2;
  const badgeH = 32;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, x, y, badgeW, badgeH, 8);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + padX, y + badgeH / 2);
}

function drawRarityFooter(
  ctx: CanvasRenderingContext2D,
  rarity: CardRarity,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const footerH = 44;
  const footerY = y + h - footerH;

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x, footerY, w, footerH);

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, footerY);
  ctx.lineTo(x + w, footerY);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 18px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(RARITY_LABEL[rarity].toUpperCase(), x + w / 2, footerY + footerH / 2);
}

function drawSurfaceBackground(
  ctx: CanvasRenderingContext2D,
  rarity: CardRarity,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const [c0, c1, c2] = RARITY_EXPORT[rarity].surface;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, c0);
  grad.addColorStop(0.45, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

function drawTemplateCard(
  ctx: CanvasRenderingContext2D,
  card: AlbumCard,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const colors = getNationColors(card.country_code);
  const cat = normalizeCategory(card.category);
  const isPlayer = cat === "joueur";
  const displayIcon = cardDisplayIcon(card.category, card.stats?.icon);

  drawSurfaceBackground(ctx, card.rarity, x, y, w, h);

  const stripeH = 6;
  const stripe = ctx.createLinearGradient(x, y, x + w, y);
  stripe.addColorStop(0, colors.primary);
  stripe.addColorStop(0.5, colors.secondary);
  stripe.addColorStop(1, colors.primary);
  ctx.fillStyle = stripe;
  ctx.fillRect(x, y, w, stripeH);

  ctx.fillStyle = `${colors.primary}cc`;
  const posLabel = (card.position ?? (isPlayer ? "Joueur" : cat)).toUpperCase();
  ctx.font = "700 16px system-ui, sans-serif";
  const posW = Math.min(ctx.measureText(posLabel).width + 24, w * 0.5);
  roundRect(ctx, x + w - posW - 16, y + stripeH + 14, posW, 28, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(posLabel, x + w - posW / 2 - 16, y + stripeH + 28);

  ctx.font = isPlayer ? "120px system-ui, sans-serif" : "96px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const centerIcon = isPlayer
    ? "👕"
    : cat === "nation"
      ? flagEmoji(card.country_code)
      : displayIcon;
  ctx.fillText(centerIcon, x + w / 2, y + h * 0.42);

  if (isPlayer && card.stats?.shirtNumber != null) {
    ctx.font = "900 48px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 4;
    ctx.strokeText(String(card.stats.shirtNumber), x + w / 2, y + h * 0.44);
    ctx.fillText(String(card.stats.shirtNumber), x + w / 2, y + h * 0.44);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 32px system-ui, sans-serif";
  ctx.fillText(card.name, x + w / 2, y + h * 0.68);

  drawRarityFooter(ctx, card.rarity, x, y, w, h);

  if (card.number > 0) {
    drawNumberBadge(ctx, card.number, x + 12, y + stripeH + 12);
  }
}

function drawCardFace(
  ctx: CanvasRenderingContext2D,
  card: AlbumCard,
  artwork: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const style = RARITY_EXPORT[card.rarity];
  const radius = 20;
  const borderW = 4;

  ctx.save();
  ctx.shadowColor = style.glow;
  ctx.shadowBlur = card.rarity === "commune" ? 0 : 28;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y, w, h, radius);
  ctx.strokeStyle = style.border;
  ctx.lineWidth = borderW;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x + borderW / 2, y + borderW / 2, w - borderW, h - borderW, radius - 2);
  ctx.clip();

  ctx.fillStyle = "#09090b";
  ctx.fillRect(x, y, w, h);

  if (artwork) {
    drawImageCover(ctx, artwork, x, y, w, h);
    drawVignette(ctx, x, y, w, h);
    drawShineOverlay(ctx, x, y, w, h, card.rarity);
    drawRarityFooter(ctx, card.rarity, x, y, w, h);
    if (card.number > 0) {
      drawNumberBadge(ctx, card.number, x + 12, y + 12);
    }
  } else {
    drawTemplateCard(ctx, card, x, y, w, h);
  }

  ctx.restore();
}

/** Autocollant packé : fond blanc, ombre, CardFace (comme à l’ouverture). */
export async function renderPackedAlbumCardImage(card: AlbumCard): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const artwork = card.image_path?.trim()
    ? await loadCardArtwork(card.image_path)
    : null;

  const mountPad = 28;
  const facePad = 16;
  const faceW = OUT_W - mountPad * 2 - facePad * 2;
  const faceH = Math.round(faceW * (4 / 3));
  const mountW = faceW + facePad * 2;
  const mountH = faceH + facePad * 2;
  const mountX = (OUT_W - mountW) / 2;
  const mountY = (OUT_H - mountH) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  roundRect(ctx, mountX, mountY, mountW, mountH, 24);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1;
  roundRect(ctx, mountX, mountY, mountW, mountH, 24);
  ctx.stroke();

  const faceX = mountX + facePad;
  const faceY = mountY + facePad;
  drawCardFace(ctx, card, artwork, faceX, faceY, faceW, faceH);

  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Empty blob"))),
      "image/png",
    );
  });
}

/** @deprecated Utiliser renderPackedAlbumCardImage */
export async function renderAlbumCardPlaceholderImage(
  card: Pick<AlbumCard, "name" | "rarity" | "number">,
): Promise<Blob> {
  return renderPackedAlbumCardImage(card as AlbumCard);
}

export function albumCardImageFilename(
  card: Pick<AlbumCard, "name" | "rarity">,
): string {
  const slug =
    card.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 36)
      .toLowerCase() || "carte";

  return `wc2026-carte-${slug}-${card.rarity}.png`;
}
