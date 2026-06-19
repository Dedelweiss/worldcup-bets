"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

function SectionSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl border border-white/[0.06] bg-zinc-900/40",
        className,
      )}
      aria-hidden
    />
  );
}

export const MatchChatLazy = dynamic(
  () =>
    import("@/components/matches/match-chat").then((m) => ({
      default: m.MatchChat,
    })),
  { loading: () => <SectionSkeleton className="h-56" /> },
);

export const PreMatchAssistantLazy = dynamic(
  () =>
    import("@/components/matches/pre-match-assistant").then((m) => ({
      default: m.PreMatchAssistant,
    })),
  { loading: () => <SectionSkeleton className="h-48" /> },
);

export const SmartBetAdvisorLazy = dynamic(
  () =>
    import("@/components/matches/smart-bet-advisor").then((m) => ({
      default: m.SmartBetAdvisor,
    })),
  { loading: () => <SectionSkeleton className="h-40" /> },
);
