"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Minus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { placeBetAction } from "@/app/(app)/matches/actions";
import {
  QuickBetSwipeCard,
  swipeChoiceLabel,
  type SwipeChoice,
} from "@/components/bets/quick-bet-swipe-card";
import { buttonVariants } from "@/components/ui/button";
import { MATCH_RESULT_COPY } from "@/lib/bets/match-result-copy";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types/database";

interface QuickBetModeProps {
  initialMatches: MatchWithTeams[];
  isDemo?: boolean;
}

export function QuickBetMode({ initialMatches, isDemo }: QuickBetModeProps) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialMatches);
  const [placing, setPlacing] = useState(false);

  const current = queue[0];
  const total = initialMatches.length;
  const done = total - queue.length;

  const handleSwipe = useCallback(
    async (choice: SwipeChoice) => {
      if (!current || placing) return;

      setPlacing(true);
      const match = current;
      const label = swipeChoiceLabel(choice, match);

      if (isDemo) {
        setQueue((q) => q.filter((m) => m.id !== match.id));
        toast.success(`Pronostic démo : ${label}`, {
          description: "Configurez Supabase pour enregistrer vos paris.",
        });
        setPlacing(false);
        return;
      }

      const result = await placeBetAction(match.id, choice);
      if (!result.success) {
        toast.error(result.error);
        setPlacing(false);
        return;
      }

      setQueue((q) => q.filter((m) => m.id !== match.id));
      toast.success(`Pronostic enregistré : ${label}`);
      setPlacing(false);
      router.refresh();
    },
    [current, placing, isDemo, router],
  );

  const openDetail = useCallback(() => {
    if (!current) return;
    router.push(`/matches/${current.id}`);
  }, [current, router]);

  return (
    <div
      className={cn(
        "z-20 flex flex-col bg-zinc-950",
        "fixed inset-x-0 top-14 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))]",
        "md:static md:inset-auto md:min-h-[calc(100dvh-8rem)] md:bg-transparent",
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:relative md:border-0 md:px-0 md:pb-4 md:pt-0">
        <Link
          href="/matches?view=group"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5 text-muted-foreground",
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Calendrier
        </Link>
        <div className="text-center">
          <p className="font-heading text-sm font-semibold text-lime-400">
            Mode rapide
          </p>
          {total > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {done}/{total} pronostic{total > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="w-[5.5rem]" aria-hidden />
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-4 pt-4 md:pb-8 md:pt-0">
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Glissez la carte pour parier vite sur les matchs de poule.
        </p>

        <ul className="mb-5 flex justify-center gap-4 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <li className="flex flex-col items-center gap-1">
            <ArrowLeft className="size-4 text-lime-400" aria-hidden />
            <span>{current?.home_team.code ?? current?.home_team.name ?? MATCH_RESULT_COPY.team1}</span>
          </li>
          <li className="flex flex-col items-center gap-1">
            <Minus className="size-4 text-fuchsia-400" aria-hidden />
            <span>Nul</span>
          </li>
          <li className="flex flex-col items-center gap-1">
            <ArrowRight className="size-4 text-sky-400" aria-hidden />
            <span>{current?.away_team.code ?? current?.away_team.name ?? MATCH_RESULT_COPY.team2}</span>
          </li>
        </ul>

        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <QuickBetSwipeCard
                  match={current}
                  disabled={placing}
                  onSwipe={handleSwipe}
                  onOpenDetail={openDetail}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-dashed border-white/15 bg-zinc-900/50 p-10 text-center backdrop-blur-md"
              >
                <Sparkles
                  className="mx-auto mb-3 size-10 text-lime-400"
                  aria-hidden
                />
                <h2 className="font-heading text-xl font-semibold">
                  {total === 0
                    ? "Aucun match à swiper"
                    : "Bravo, c'est complet !"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {total === 0
                    ? "Tous vos matchs de poule ont un pronostic ou ne sont plus ouverts aux paris."
                    : "Vous avez traité tous les matchs disponibles en mode rapide."}
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <Link href="/matches?view=group" className={buttonVariants()}>
                    Voir le calendrier
                  </Link>
                  <Link
                    href="/bets"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Mes pronostics
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {queue.length > 1 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              +{queue.length - 1} match{queue.length > 2 ? "s" : ""} suivant
              {queue.length > 2 ? "s" : ""}
            </p>
          )}
        </div>

        {placing && (
          <p className="mt-4 text-center text-sm text-lime-400/90">
            Enregistrement du pronostic…
          </p>
        )}
      </div>
    </div>
  );
}
