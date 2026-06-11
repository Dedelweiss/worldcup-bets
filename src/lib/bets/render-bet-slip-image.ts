import type { BetSlipShareLine } from "@/lib/bets/bet-slip-share";

const WIDTH = 540;
const PAD = 36;
const LINE_H = 108;
const HEADER_H = 108;
const FOOTER_H = 52;

export interface BetSlipShareMeta {
  playerName: string;
  lines: BetSlipShareLine[];
  onFire?: boolean;
}

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

function computeHeight(lineCount: number): number {
  const linesBlock = Math.max(1, lineCount) * LINE_H;
  const minStory = Math.round((WIDTH * 16) / 9);
  return Math.max(minStory, PAD + HEADER_H + linesBlock + FOOTER_H + PAD);
}

export function renderBetSlipImage(meta: BetSlipShareMeta): Promise<Blob> {
  const height = computeHeight(meta.lines.length);
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Canvas unavailable"));
  }

  roundRect(ctx, 0, 0, WIDTH, height, 32);
  ctx.fillStyle = "#09090b";
  ctx.fill();

  const glow = ctx.createRadialGradient(WIDTH / 2, 0, 0, WIDTH / 2, 0, height * 0.42);
  glow.addColorStop(0, "rgba(163,230,53,0.2)");
  glow.addColorStop(1, "rgba(9,9,11,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, WIDTH - 2, height - 2, 30);
  ctx.stroke();

  let y = PAD;

  ctx.fillStyle = "#bef264";
  ctx.font = "600 16px system-ui, -apple-system, sans-serif";
  ctx.fillText("MON SLIP", PAD, y + 14);

  ctx.fillStyle = "#fafafa";
  ctx.font = "700 30px system-ui, -apple-system, sans-serif";
  ctx.fillText(truncate(ctx, meta.playerName, WIDTH - PAD * 2 - (meta.onFire ? 120 : 0)), PAD, y + 52);

  if (meta.onFire) {
    const badgeW = 108;
    const badgeX = WIDTH - PAD - badgeW;
    roundRect(ctx, badgeX, y + 22, badgeW, 34, 17);
    ctx.fillStyle = "rgba(249,115,22,0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(251,146,60,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#fdba74";
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🔥 On Fire", badgeX + badgeW / 2, y + 44);
    ctx.textAlign = "left";
  }

  y += HEADER_H;

  if (meta.lines.length === 0) {
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "400 18px system-ui, sans-serif";
    ctx.fillText("Aucun pari à afficher.", PAD, y + 24);
    y += LINE_H;
  } else {
    for (const line of meta.lines) {
      const cardH = LINE_H - 12;
      roundRect(ctx, PAD, y, WIDTH - PAD * 2, cardH, 18);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const liveBadgeW = line.isLive ? 62 : 0;
      const matchMax = WIDTH - PAD * 2 - 24 - liveBadgeW;

      ctx.fillStyle = "#d4d4d8";
      ctx.font = "500 15px system-ui, sans-serif";
      ctx.fillText(truncate(ctx, line.matchLabel, matchMax), PAD + 14, y + 26);

      if (line.isLive) {
        const bx = WIDTH - PAD - 14 - 58;
        roundRect(ctx, bx, y + 10, 58, 22, 11);
        ctx.fillStyle = "rgba(163,230,53,0.18)";
        ctx.fill();
        ctx.fillStyle = "#bef264";
        ctx.font = "700 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("● LIVE", bx + 29, y + 25);
        ctx.textAlign = "left";
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.fillText(truncate(ctx, line.pickLabel, WIDTH - PAD * 2 - 28), PAD + 14, y + 54);

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "400 14px system-ui, sans-serif";
      ctx.fillText(`Cote ${line.oddLabel}`, PAD + 14, y + cardH - 14);

      ctx.fillStyle = "#bef264";
      ctx.font = "700 16px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(line.pointsLabel, WIDTH - PAD - 14, y + cardH - 14);
      ctx.textAlign = "left";

      y += LINE_H;
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(PAD, height - PAD - FOOTER_H + 8);
  ctx.lineTo(WIDTH - PAD, height - PAD - FOOTER_H + 8);
  ctx.stroke();

  ctx.fillStyle = "#71717a";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("WC2026 POOL", WIDTH / 2, height - PAD - 8);

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
