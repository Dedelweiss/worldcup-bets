import type { MouseEventHandler } from "react";

export type HapticStyle = "light" | "selection" | "medium";

const VIBRATION_MS: Record<HapticStyle, number | number[]> = {
  light: 6,
  selection: 10,
  medium: 16,
};

function canVibrate(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  if (!("vibrate" in navigator)) return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export function triggerHaptic(style: HapticStyle = "light"): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(VIBRATION_MS[style]);
  } catch {
    // Ignored: low power mode, permissions, unsupported browser.
  }
}

export function bindHapticClick<E extends HTMLElement>(
  handler?: MouseEventHandler<E>,
  style: HapticStyle = "light",
): MouseEventHandler<E> {
  return (event) => {
    triggerHaptic(style);
    handler?.(event);
  };
}
