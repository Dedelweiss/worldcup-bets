"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface MatchPageNavTab {
  id: string;
  label: string;
  /** Point rouge */
  dot?: boolean;
  /** Nombre affiché */
  badge?: number;
  /** Badge animé (marchés fun ouverts) */
  pulse?: boolean;
}

interface MatchPageNavProps {
  tabs: MatchPageNavTab[];
  className?: string;
}

export function MatchPageNav({ tabs, className }: MatchPageNavProps) {
  const [activeId, setActiveId] = useState<string | null>(tabs[0]?.id ?? null);

  const updateActiveFromScroll = useCallback(() => {
    const offset = 120;
    let current: string | null = tabs[0]?.id ?? null;

    for (const tab of tabs) {
      const el = document.getElementById(tab.id);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      if (top <= offset) {
        current = tab.id;
      }
    }

    setActiveId(current);
  }, [tabs]);

  useEffect(() => {
    updateActiveFromScroll();
    window.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveFromScroll);
  }, [updateActiveFromScroll]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && tabs.some((t) => t.id === hash)) {
      setActiveId(hash);
    }
  }, [tabs]);

  if (tabs.length === 0) return null;

  function handleClick(id: string) {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${id}`);
    }
  }

  return (
    <nav
      aria-label="Sections du match"
      className={cn(
        "sticky top-14 z-20 -mx-4 border-b border-white/[0.06] bg-zinc-950/90 px-4 backdrop-blur-xl md:-mx-0 md:px-0",
        className,
      )}
    >
      <div className="flex gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleClick(tab.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/[0.08] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
              aria-current={isActive ? "true" : undefined}
            >
              {tab.label}
              {tab.dot && (
                <span
                  className="size-1.5 rounded-full bg-red-500"
                  aria-label="Action requise"
                />
              )}
              {tab.badge != null && tab.badge > 0 && (
                <span
                  className={cn(
                    "inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                    tab.pulse
                      ? "animate-pulse bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
                      : "bg-white/10 text-foreground/80",
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
