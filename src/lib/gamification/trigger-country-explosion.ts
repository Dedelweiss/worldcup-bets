import confetti from "canvas-confetti";
import { getEmojisForCountry } from "@/lib/gamification/country-emojis";

export type ExplosionSide = "left" | "right" | "center";

const EMOJI_SCALAR = 1.35;
const BURST_PARTICLE_COUNT = 56;
const SECOND_BURST_COUNT = 22;

const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", system-ui, sans-serif';

function emojiShapes(emojis: readonly string[]): confetti.Shape[] {
  return emojis.map((text) =>
    confetti.shapeFromText({
      text,
      scalar: EMOJI_SCALAR,
      fontFamily: EMOJI_FONT,
    }),
  );
}

function burst(
  shapes: confetti.Shape[],
  options: confetti.Options,
): void {
  void confetti({
    disableForReducedMotion: true,
    zIndex: 9999,
    scalar: EMOJI_SCALAR,
    shapes,
    ...options,
  });
}

/**
 * Explosion de confettis emoji depuis un bord de l'écran (swipe équipe domicile / extérieur).
 */
export function triggerCountryExplosion(
  countryCode: string | null | undefined,
  side: ExplosionSide,
): void {
  if (typeof window === "undefined") return;

  const emojis = getEmojisForCountry(countryCode);
  const shapes = emojiShapes(emojis);

  const isLeft = side === "left";
  const isCenter = side === "center";

  const originX = isCenter ? 0.5 : isLeft ? 0.1 : 0.9;
  const angle = isCenter ? 90 : isLeft ? 55 : 125;

  burst(shapes, {
    particleCount: BURST_PARTICLE_COUNT,
    spread: isCenter ? 100 : 72,
    startVelocity: isCenter ? 42 : 52,
    gravity: 0.85,
    ticks: 240,
    origin: { x: originX, y: isCenter ? 0.35 : 0.52 },
    angle,
    drift: isLeft ? 0.4 : isCenter ? 0 : -0.4,
  });

  window.setTimeout(() => {
    const accent = emojiShapes([emojis[Math.floor(Math.random() * emojis.length)]!]);
    burst(accent, {
      particleCount: SECOND_BURST_COUNT,
      spread: 50,
      startVelocity: 38,
      gravity: 1,
      ticks: 180,
      origin: { x: originX, y: isCenter ? 0.4 : 0.48 },
      angle: isCenter ? 90 : angle,
    });
  }, 100);
}

/** Match nul (swipe vers le haut) : emojis football génériques. */
export function triggerDrawExplosion(): void {
  triggerCountryExplosion(null, "center");
}
