"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { StepParticleKind } from "@/lib/onboarding/step-themes";
import { useIsClient } from "@/lib/use-is-client";

interface OnboardingAmbientBackgroundProps {
  ambientClass: string;
  orbA: string;
  orbB: string;
  particles?: StepParticleKind;
  stepKey: string;
}

const PARTICLE_CONFIG: Record<
  StepParticleKind,
  { count: number; chars?: string[]; size: string }
> = {
  sparkles: { count: 14, chars: ["✦", "✧", "·"], size: "text-xs" },
  hearts: { count: 10, chars: ["♥", "♡"], size: "text-sm" },
  stars: { count: 12, chars: ["★", "☆"], size: "text-xs" },
  flames: { count: 10, chars: ["🔥", "✦"], size: "text-sm" },
  confetti: {
    count: 18,
    chars: ["🎉", "✦", "★", "·"],
    size: "text-sm",
  },
};

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function particleClass(particles: StepParticleKind, size: string) {
  return cn(
    "absolute select-none opacity-20",
    size,
    particles === "hearts" && "text-rose-400/60",
    particles === "stars" && "text-amber-300/50",
    particles === "flames" && "text-orange-400/40",
    particles === "confetti" && "text-violet-300/50",
    particles === "sparkles" && "text-white/40",
  );
}

export function OnboardingAmbientBackground({
  ambientClass,
  orbA,
  orbB,
  particles = "sparkles",
  stepKey,
}: OnboardingAmbientBackgroundProps) {
  const isClient = useIsClient();
  const reduceMotion = useReducedMotion();
  const cfg = PARTICLE_CONFIG[particles];
  const particleCount = reduceMotion ? 0 : cfg.count;

  const particleLayout = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => ({
        left: pseudoRandom(i + stepKey.length * 3) * 100,
        top: pseudoRandom(i + stepKey.length * 7) * 100,
        delay: pseudoRandom(i + 1) * 4,
        duration: 4 + pseudoRandom(i + 2) * 5,
        char: cfg.chars?.[i % (cfg.chars?.length ?? 1)] ?? "·",
      })),
    [cfg.chars, particleCount, stepKey],
  );

  const showMotion = isClient && !reduceMotion;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br transition-colors duration-700",
          ambientClass,
        )}
      />
      <div className="absolute inset-0 bg-zinc-950/40" />

      {showMotion ? (
        <>
          <motion.div
            className="absolute -left-8 top-[2%] size-[min(48vmin,18rem)] rounded-full blur-3xl max-sm:left-0 max-sm:size-[min(40vmin,14rem)]"
            style={{ background: orbA }}
            animate={{ opacity: [0.5, 0.75, 0.5], scale: [1, 1.08, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-8 bottom-[2%] size-[min(44vmin,16rem)] rounded-full blur-3xl max-sm:right-0 max-sm:size-[min(36vmin,12rem)]"
            style={{ background: orbB }}
            animate={{ opacity: [0.45, 0.7, 0.45], scale: [1, 1.06, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute -left-8 top-[2%] size-[min(48vmin,18rem)] rounded-full blur-3xl max-sm:left-0 max-sm:size-[min(40vmin,14rem)]"
            style={{ background: orbA }}
          />
          <div
            className="absolute -right-8 bottom-[2%] size-[min(44vmin,16rem)] rounded-full blur-3xl max-sm:right-0 max-sm:size-[min(36vmin,12rem)]"
            style={{ background: orbB }}
          />
        </>
      )}

      <div
        className="absolute inset-0 hidden opacity-[0.03] sm:block"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {showMotion
        ? particleLayout.map((p, i) => (
            <motion.span
              key={`${stepKey}-p-${i}`}
              className={cn(
                particleClass(particles, cfg.size),
                "hidden sm:inline",
              )}
              style={{ left: `${p.left}%`, top: `${p.top}%` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.45, 0],
                y: [0, -24, -48],
                scale: [0.5, 1, 0.5],
                rotate: [0, 120],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
            >
              {p.char}
            </motion.span>
          ))
        : null}
    </div>
  );
}
