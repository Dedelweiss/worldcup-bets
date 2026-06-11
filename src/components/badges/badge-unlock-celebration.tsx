"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { fetchUnlockedBadgesAction } from "@/app/(app)/live-bets-actions";
import { BadgeIcon } from "@/components/badges/badge-icon";
import { BadgeRarityChip } from "@/components/badges/badge-rarity-chip";
import { Button } from "@/components/ui/button";
import { parseBadgeRarity, type BadgeRarity } from "@/lib/badge-rarity";
import type { PlayerBadge } from "@/lib/badges";
import { triggerHaptic } from "@/lib/haptics";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "wc_badge_celebrated_v1";
const CELEBRATION_RARITIES = new Set<BadgeRarity>(["epic", "legendary"]);
const POLL_INTERVAL_MS = 90_000;

function readCelebratedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeCelebratedIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function isCelebrationBadge(badge: PlayerBadge): boolean {
  return CELEBRATION_RARITIES.has(parseBadgeRarity(badge.rarity));
}

export function BadgeUnlockCelebration() {
  const celebratedRef = useRef<Set<string>>(readCelebratedIds());
  const queueRef = useRef<PlayerBadge[]>([]);
  const [active, setActive] = useState<PlayerBadge | null>(null);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    setActive(next);
    if (next) {
      triggerHaptic("celebration");
    }
  }, []);

  const enqueueNewBadges = useCallback(
    (badges: PlayerBadge[]) => {
      for (const badge of badges) {
        if (!isCelebrationBadge(badge)) continue;
        if (celebratedRef.current.has(badge.id)) continue;
        celebratedRef.current.add(badge.id);
        writeCelebratedIds(celebratedRef.current);
        queueRef.current.push(badge);
      }
      if (!active && queueRef.current.length > 0) {
        showNext();
      }
    },
    [active, showNext],
  );

  useEffect(() => {
    if (!hasSupabaseConfig) return;

    async function poll() {
      const badges = await fetchUnlockedBadgesAction();

      if (!localStorage.getItem(STORAGE_KEY)) {
        const initial = badges.filter(isCelebrationBadge).map((b) => b.id);
        celebratedRef.current = new Set(initial);
        writeCelebratedIds(celebratedRef.current);
        return;
      }

      enqueueNewBadges(badges);
    }

    void poll();
    const id = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enqueueNewBadges]);

  function dismiss() {
    setActive(null);
    window.setTimeout(showNext, 280);
  }

  const rarity = active ? parseBadgeRarity(active.rarity) : "common";

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal
          aria-labelledby="badge-unlock-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            aria-label="Fermer"
            onClick={dismiss}
          />

          <motion.div
            className={cn(
              "relative w-full max-w-sm overflow-hidden rounded-3xl border p-6 text-center shadow-2xl",
              rarity === "legendary"
                ? "border-amber-400/50 bg-gradient-to-b from-amber-500/20 via-zinc-950 to-zinc-950 badge-legendary-shimmer"
                : "border-violet-400/45 bg-gradient-to-b from-violet-500/20 via-zinc-950 to-zinc-950",
            )}
            initial={{ scale: 0.85, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>

            <div className="mb-2 flex justify-center">
              <Sparkles
                className={cn(
                  "size-5",
                  rarity === "legendary" ? "text-amber-300" : "text-violet-300",
                )}
                aria-hidden
              />
            </div>

            <p
              id="badge-unlock-title"
              className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-lime-300"
            >
              Nouveau succès
            </p>

            <div className="my-5 flex justify-center">
              <BadgeIcon
                iconName={active.icon_name}
                rarity={active.rarity}
                size="lg"
                className="size-16"
              />
            </div>

            <h2 className="font-heading text-xl font-bold">{active.name}</h2>
            <div className="mt-2 flex justify-center">
              <BadgeRarityChip rarity={active.rarity} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {active.description}
            </p>

            <Button
              type="button"
              className="mt-6 w-full bg-lime-400 text-black hover:bg-lime-300"
              onClick={dismiss}
            >
              Let&apos;s go !
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
