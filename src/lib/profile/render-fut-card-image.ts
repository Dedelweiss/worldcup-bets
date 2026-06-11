import type { FUTCardStats } from "@/lib/profile/calculate-fut-stats";
import { teamLogoUrl } from "@/lib/flags";
import type { Team } from "@/types/database";

const WIDTH = 560;
const HEIGHT = 760;

export interface FutCardRenderInput {
  playerName: string;
  avatarUrl: string | null;
  initials: string;
  favoriteTeam: Team | null;
  futStats: FUTCardStats;
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

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const response = await fetch(resolveFetchTarget(src), { cache: "no-store" });
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = dataUrl;
    });
  } catch {
    return null;
  }
}

function clipFutCard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w * 0.06;
  const cy = h * 0.06;
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(cx, 0);
  ctx.lineTo(w - cx, 0);
  ctx.lineTo(w, cy);
  ctx.lineTo(w, h - cy);
  ctx.lineTo(w - cx, h);
  ctx.lineTo(cx, h);
  ctx.lineTo(0, h - cy);
  ctx.closePath();
}

function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

export async function renderFutCardImage(
  input: FutCardRenderInput,
): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unavailable");
  }

  const flagSrc = input.favoriteTeam
    ? teamLogoUrl({
        logo_url: input.favoriteTeam.logo_url,
        code: input.favoriteTeam.code,
      })
    : null;

  const [avatarImage, flagImage] = await Promise.all([
    input.avatarUrl ? loadImage(input.avatarUrl) : Promise.resolve(null),
    flagSrc ? loadImage(flagSrc) : Promise.resolve(null),
  ]);

  ctx.save();
  clipFutCard(ctx, WIDTH, HEIGHT);
  ctx.clip();

  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "rgba(163,230,53,0.2)");
  gradient.addColorStop(0.45, "rgba(0,0,0,0)");
  gradient.addColorStop(0.7, "rgba(217,70,239,0.18)");
  gradient.addColorStop(1, "rgba(163,230,53,0.1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const pad = 32;

  ctx.fillStyle = "rgba(163,230,53,0.75)";
  ctx.font = "700 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("OVR", pad, pad + 18);

  ctx.fillStyle = "#bef264";
  ctx.font = "900 88px system-ui, -apple-system, sans-serif";
  ctx.fillText(String(input.futStats.ovr), pad, pad + 100);

  if (input.favoriteTeam) {
    const flagSize = 72;
    const fx = WIDTH - pad - flagSize;
    const fy = pad;
    ctx.strokeStyle = "rgba(163,230,53,0.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(fx, fy, flagSize, flagSize);
    if (flagImage) {
      ctx.drawImage(flagImage, fx + 4, fy + 4, flagSize - 8, flagSize - 8);
    }
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      truncate(
        ctx,
        input.favoriteTeam.code ?? input.favoriteTeam.name,
        90,
      ),
      WIDTH - pad,
      fy + flagSize + 20,
    );
    ctx.textAlign = "left";
  }

  const avatarSize = 224;
  const avatarX = (WIDTH - avatarSize) / 2;
  const avatarY = 200;

  ctx.fillStyle = "rgba(163,230,53,0.12)";
  ctx.beginPath();
  ctx.arc(
    WIDTH / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2 + 20,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2,
    0,
    Math.PI * 2,
  );
  ctx.clip();
  if (avatarImage) {
    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    const initialsGrad = ctx.createLinearGradient(
      avatarX,
      avatarY,
      avatarX + avatarSize,
      avatarY + avatarSize,
    );
    initialsGrad.addColorStop(0, "#3f3f46");
    initialsGrad.addColorStop(1, "#09090b");
    ctx.fillStyle = initialsGrad;
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = "#bef264";
    ctx.font = "700 48px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      input.initials,
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2 + 16,
    );
    ctx.textAlign = "left";
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(163,230,53,0.55)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  ctx.fillStyle = "#fafafa";
  ctx.font = "700 24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    truncate(ctx, input.playerName.toUpperCase(), WIDTH - pad * 2),
    WIDTH / 2,
    avatarY + avatarSize + 44,
  );

  ctx.fillStyle = "rgba(217,70,239,0.85)";
  ctx.font = "600 16px system-ui, sans-serif";
  ctx.fillText("PRONOSTIQUEUR", WIDTH / 2, avatarY + avatarSize + 72);
  ctx.textAlign = "left";

  const gridTop = avatarY + avatarSize + 96;
  const gridPad = pad;
  const cellW = (WIDTH - gridPad * 2 - 16) / 3;
  const cellH = 72;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(gridPad, gridTop, WIDTH - gridPad * 2, cellH * 2 + 20, 12);
  ctx.fill();
  ctx.stroke();

  input.futStats.stats.forEach((stat, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = gridPad + 10 + col * (cellW + 8);
    const y = gridTop + 10 + row * (cellH + 8);

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.roundRect(x, y, cellW, cellH, 8);
    ctx.fill();

    ctx.fillStyle = "#a1a1aa";
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(stat.short, x + cellW / 2, y + 26);

    ctx.fillStyle = "#bef264";
    ctx.font = "700 32px system-ui, sans-serif";
    ctx.fillText(String(stat.value), x + cellW / 2, y + 58);
  });
  ctx.textAlign = "left";

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("WC2026 POOL", WIDTH / 2, HEIGHT - 28);
  ctx.textAlign = "left";

  ctx.restore();

  ctx.strokeStyle = "rgba(163,230,53,0.35)";
  ctx.lineWidth = 4;
  clipFutCard(ctx, WIDTH, HEIGHT);
  ctx.stroke();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.size === 0) {
        reject(new Error("Empty canvas blob"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
