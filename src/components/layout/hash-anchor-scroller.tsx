"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function scrollToCurrentHash(behavior: ScrollBehavior = "smooth") {
  const id = window.location.hash.slice(1);
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior, block: "start" });
  return true;
}

/**
 * Next.js client navigation does not always scroll to URL hashes.
 * Retries briefly so async sections (bet slip, etc.) are in the DOM.
 */
export function HashAnchorScroller() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    const tryScroll = () => {
      if (cancelled || !window.location.hash) return;
      const done = scrollToCurrentHash(attempts === 0 ? "auto" : "smooth");
      attempts += 1;
      if (!done && attempts < maxAttempts) {
        window.setTimeout(tryScroll, 80);
      }
    };

    const start = window.setTimeout(tryScroll, 50);

    const onHashChange = () => {
      attempts = 0;
      window.setTimeout(tryScroll, 50);
    };
    window.addEventListener("hashchange", onHashChange);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [pathname]);

  return null;
}
