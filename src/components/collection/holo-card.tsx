"use client";

import { useRef, useSyncExternalStore, type PointerEvent } from "react";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function getCapable(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia(FINE_POINTER).matches &&
    !window.matchMedia(REDUCED_MOTION).matches
  );
}

function subscribeCapable(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const m1 = window.matchMedia(FINE_POINTER);
  const m2 = window.matchMedia(REDUCED_MOTION);
  m1.addEventListener("change", cb);
  m2.addEventListener("change", cb);
  return () => {
    m1.removeEventListener("change", cb);
    m2.removeEventListener("change", cb);
  };
}

/**
 * Effet holographique (tilt + gloss qui suit le curseur) pour les cartes Rare+.
 * CSS pur, GPU-friendly (transform/opacity). Désactivé sur pointeur grossier
 * (mobile) et si l'utilisateur préfère moins d'animations.
 */
export function HoloCard({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const glossRef = useRef<HTMLDivElement>(null);
  const capable = useSyncExternalStore(
    subscribeCapable,
    getCapable,
    () => false,
  );
  const enabled = active && capable;

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!enabled || !el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(600px) rotateX(${(0.5 - py) * 14}deg) rotateY(${(px - 0.5) * 14}deg) scale(1.04)`;
    const gloss = glossRef.current;
    if (gloss) {
      gloss.style.opacity = "1";
      gloss.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.6), rgba(255,255,255,0) 42%), linear-gradient(${px * 140 + 50}deg, rgba(255,0,153,0.4), rgba(0,225,255,0.4), rgba(180,255,0,0.4), rgba(255,170,0,0.4))`;
    }
  }

  function reset() {
    const el = ref.current;
    if (el) el.style.transform = "";
    if (glossRef.current) glossRef.current.style.opacity = "0";
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className="relative"
      style={{
        transition: "transform 150ms ease-out",
        transformStyle: "preserve-3d",
        willChange: enabled ? "transform" : undefined,
      }}
    >
      {children}
      <div
        ref={glossRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl mix-blend-overlay"
        style={{ opacity: 0, transition: "opacity 200ms ease-out" }}
      />
    </div>
  );
}
