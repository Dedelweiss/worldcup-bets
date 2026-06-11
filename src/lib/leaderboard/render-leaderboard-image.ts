import type { LeaderboardShareMeta } from "@/lib/leaderboard/leaderboard-export";

const WIDTH = 600;
const PAD = 32;
const ROW_H = 48;
const PODIUM_H = 130;

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

function computeHeight(meta: LeaderboardShareMeta): number {
  const podium = meta.rows.some((r) => r.rank <= 3) ? PODIUM_H + 16 : 0;
  const rest = Math.max(0, meta.rows.filter((r) => r.rank > 3).length);
  const overflow = meta.overflowCount > 0 ? 24 : 0;
  return PAD + 118 + podium + rest * ROW_H + overflow + 56 + PAD;
}

export function renderLeaderboardImage(meta: LeaderboardShareMeta): Promise<Blob> {
  const height = computeHeight(meta);
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Canvas unavailable"));
  }

  roundRect(ctx, 0, 0, WIDTH, height, 28);
  ctx.fillStyle = "#09090b";
  ctx.fill();

  const glow = ctx.createRadialGradient(WIDTH / 2, 0, 0, WIDTH / 2, 0, height * 0.45);
  glow.addColorStop(0, "rgba(251,191,36,0.24)");
  glow.addColorStop(1, "rgba(9,9,11,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, WIDTH - 2, height - 2, 26);
  ctx.stroke();

  let y = PAD + 8;

  ctx.fillStyle = "#fcd34d";
  ctx.font = "600 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("🏆  CLASSEMENT", PAD, y);

  y += 34;
  ctx.fillStyle = "#fafafa";
  ctx.font = "700 28px system-ui, -apple-system, sans-serif";
  ctx.fillText(truncate(ctx, meta.title, WIDTH - PAD * 2), PAD, y);

  y += 26;
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "400 15px system-ui, -apple-system, sans-serif";
  ctx.fillText(truncate(ctx, meta.subtitle, WIDTH - PAD * 2), PAD, y);

  y += 24;
  ctx.fillStyle = "#71717a";
  ctx.font = "500 13px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${meta.sortLabel}  ·  ${meta.dateLabel}`, PAD, y);

  const podium = meta.rows.filter((r) => r.rank <= 3);
  const rest = meta.rows.filter((r) => r.rank > 3);

  if (podium.length > 0) {
    y += 28;
    const order = [podium[1], podium[0], podium[2]].filter(Boolean) as typeof podium;
    const colW = (WIDTH - PAD * 2 - 16) / 3;
    const colors = {
      gold: { bg: "rgba(251,191,36,0.28)", border: "rgba(251,191,36,0.55)", text: "#fef3c7" },
      silver: { bg: "rgba(212,212,216,0.22)", border: "rgba(212,212,216,0.45)", text: "#f4f4f5" },
      bronze: { bg: "rgba(249,115,22,0.24)", border: "rgba(234,88,12,0.45)", text: "#ffedd5" },
    };

    order.forEach((row, index) => {
      const medal = row.medal ?? "gold";
      const palette = colors[medal];
      const x = PAD + index * (colW + 8);
      const h = row.rank === 1 ? PODIUM_H : PODIUM_H - 18;
      const top = y + (PODIUM_H - h);

      roundRect(ctx, x, top, colW, h, 14);
      ctx.fillStyle = palette.bg;
      ctx.fill();
      ctx.strokeStyle = palette.border;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = palette.text;
      ctx.font = "700 16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(row.rank === 1 ? "👑" : `#${row.rank}`, x + colW / 2, top + 26);

      ctx.font = "600 14px system-ui, sans-serif";
      ctx.fillText(truncate(ctx, row.label, colW - 16), x + colW / 2, top + 52);

      ctx.font = "700 20px system-ui, sans-serif";
      ctx.fillText(row.value, x + colW / 2, top + h - 16);
      ctx.textAlign = "left";
    });

    y += PODIUM_H + 8;
  }

  for (const row of rest) {
    roundRect(ctx, PAD, y, WIDTH - PAD * 2, ROW_H - 6, 12);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();

    roundRect(ctx, PAD + 10, y + 8, 32, 32, 8);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.fillStyle = "#d4d4d8";
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(row.rank), PAD + 26, y + 30);
    ctx.textAlign = "left";

    const suffix = `${row.onFire ? " 🔥" : ""}${row.isAi ? " ✨" : ""}`;
    ctx.fillStyle = "#fafafa";
    ctx.font = "500 16px system-ui, sans-serif";
    ctx.fillText(
      truncate(ctx, `${row.label}${suffix}`, WIDTH - PAD * 2 - 120),
      PAD + 54,
      y + 30,
    );

    ctx.fillStyle = "#fde68a";
    ctx.font = "700 17px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(row.value, WIDTH - PAD - 12, y + 30);
    ctx.textAlign = "left";

    y += ROW_H;
  }

  if (meta.overflowCount > 0) {
    ctx.fillStyle = "#71717a";
    ctx.font = "400 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `+ ${meta.overflowCount} autre${meta.overflowCount > 1 ? "s" : ""} joueur${meta.overflowCount > 1 ? "s" : ""}`,
      WIDTH / 2,
      y + 10,
    );
    ctx.textAlign = "left";
    y += 24;
  }

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.moveTo(PAD, height - PAD - 20);
  ctx.lineTo(WIDTH - PAD, height - PAD - 20);
  ctx.stroke();

  ctx.fillStyle = "#71717a";
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("WC2026 POOL", WIDTH / 2, height - PAD + 4);

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
