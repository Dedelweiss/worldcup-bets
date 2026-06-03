"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { MessageSquare, Radio } from "lucide-react";
import { AiPlayerBadge } from "@/components/leaderboard/ai-player-badge";
import { TeamFlag } from "@/components/shared/team-flag";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGlobalChat } from "@/hooks/use-global-chat";
import { isAiPlayer } from "@/lib/ai/constants";
import {
  formatGlobalChatMatchLabel,
  type GlobalLiveChatMessage,
} from "@/lib/global-live-chat";
import {
  getPlayerInitials,
  getPlayerLabel,
} from "@/lib/profile/player-label";
import { cn } from "@/lib/utils";

interface GlobalLiveChatProps {
  initialMessages: GlobalLiveChatMessage[];
  initialLiveMatchIds: number[];
  enabled?: boolean;
  className?: string;
}

function formatMessageTime(iso: string): string {
  return format(new Date(iso), "HH:mm", { locale: fr });
}

function MatchPill({ message }: { message: GlobalLiveChatMessage }) {
  const label = formatGlobalChatMatchLabel(message);

  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-lime-400/40 bg-lime-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-lime-300">
      <TeamFlag
        name={message.home_team.name}
        code={message.home_team.code}
        logoUrl={message.home_team.logo_url}
        size={12}
        className="shrink-0"
      />
      <span className="truncate">{label}</span>
      <TeamFlag
        name={message.away_team.name}
        code={message.away_team.code}
        logoUrl={message.away_team.logo_url}
        size={12}
        className="shrink-0"
      />
    </span>
  );
}

function ChatMessageRow({
  message,
  animateIn,
  onNavigate,
}: {
  message: GlobalLiveChatMessage;
  animateIn: boolean;
  onNavigate: (matchId: number) => void;
}) {
  const isAi = isAiPlayer(message.user_id);
  const label = getPlayerLabel(message);
  const initials = getPlayerInitials(message);
  const href = `/matches/${message.match_id}#chambrages`;

  return (
    <motion.div
      initial={animateIn ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="group relative"
    >
      <Link
        href={href}
        onClick={(e) => {
          e.preventDefault();
          onNavigate(message.match_id);
        }}
        className="flex cursor-pointer gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-white/5"
      >
        <Avatar
          size="sm"
          className={cn(
            "mt-0.5 size-7 shrink-0",
            isAi && "ring-1 ring-fuchsia-500/40",
          )}
        >
          {message.avatar_url ? (
            <AvatarImage src={message.avatar_url} alt="" />
          ) : null}
          <AvatarFallback className="text-[9px] font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <MatchPill message={message} />
            <span className="text-[10px] tabular-nums text-zinc-500">
              {formatMessageTime(message.created_at)}
            </span>
          </div>
          <div className="flex items-start gap-1">
            <p className="min-w-0 flex-1 text-xs leading-snug">
              <span className="font-medium text-zinc-400">{label}</span>
              {isAi && <AiPlayerBadge className="ml-1 scale-90" />}
              <span className="text-zinc-400"> · </span>
              <span className="text-white">{message.message}</span>
            </p>
            <MessageSquare
              className="mt-0.5 size-3.5 shrink-0 text-fuchsia-400 opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function GlobalLiveChat({
  initialMessages,
  initialLiveMatchIds,
  enabled = true,
  className,
}: GlobalLiveChatProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, liveMatchCount, isNewMessage } = useGlobalChat({
    initialMessages,
    initialLiveMatchIds,
    enabled,
  });

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleNavigate = useCallback(
    (matchId: number) => {
      router.push(`/matches/${matchId}#chambrages`);
    },
    [router],
  );

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 shadow-lg shadow-black/20 backdrop-blur-md",
        className,
      )}
      aria-label="Multiplex live chat"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold">
            <Radio className="size-4 shrink-0 text-lime-400" aria-hidden />
            Multiplex Live
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {liveMatchCount > 0
              ? `${liveMatchCount} match${liveMatchCount > 1 ? "s" : ""} en direct · lecture seule`
              : "Aucun match en direct"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-medium text-fuchsia-300">
          LIVE
        </span>
      </header>

      <div
        ref={scrollRef}
        className="flex max-h-[min(420px,42vh)] min-h-[180px] flex-1 flex-col gap-1 overflow-y-auto px-3 py-3"
      >
        {messages.length === 0 ? (
          <p className="m-auto px-2 text-center text-xs text-muted-foreground">
            {liveMatchCount > 0
              ? "Le mur est calme pour l'instant. Cliquez sur un match en direct pour lancer la chambrerie."
              : "Les messages des matchs en direct s'afficheront ici."}
          </p>
        ) : (
          messages.map((message) => (
            <ChatMessageRow
              key={message.id}
              message={message}
              animateIn={isNewMessage(message.id)}
              onNavigate={handleNavigate}
            />
          ))
        )}
      </div>

      <footer className="shrink-0 border-t border-white/10 px-4 py-2.5">
        <p className="text-center text-[10px] text-muted-foreground">
          Survolez ou cliquez un message pour répondre sur le mur du match
        </p>
      </footer>
    </section>
  );
}
