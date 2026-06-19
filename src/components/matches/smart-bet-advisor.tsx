"use client";

import { useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Send, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildAdvisorSuggestions } from "@/lib/ai/build-advisor-prompt";

interface SmartBetAdvisorProps {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label="L'IA réfléchit">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-1 rounded-full bg-lime-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

function MessageText({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  return (
    <span>
      {text}
      {isStreaming && text === "" && <TypingDots />}
    </span>
  );
}

export function SmartBetAdvisor({
  matchId,
  homeTeam,
  awayTeam,
}: SmartBetAdvisorProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = buildAdvisorSuggestions(homeTeam, awayTeam);

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/matches/${matchId}/advisor`,
    }),
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;

  function getMessageText(msg: (typeof messages)[number]): string {
    return msg.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");
  }

  async function handleSend(text: string) {
    if (!text.trim() || isStreaming) return;
    setInput("");
    await sendMessage({ text: text.trim() });
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  function handleSuggestionClick(suggestion: string) {
    handleSend(suggestion);
  }

  const lastMessage = messages.at(-1);
  const lastIsAssistant = lastMessage?.role === "assistant";
  const lastText = lastMessage ? getMessageText(lastMessage) : "";

  return (
    <motion.div
      className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-md"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      aria-label="Conseiller paris IA"
    >
      <div className="border-b border-white/10 bg-gradient-to-r from-fuchsia-500/10 via-transparent to-lime-400/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <Bot className="size-4 shrink-0 text-fuchsia-400" aria-hidden />
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-fuchsia-300">
            Conseiller Paris IA
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {!hasMessages && (
          <AnimatePresence>
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-[11px] text-muted-foreground">
                Pose une question ou choisis un sujet :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isStreaming}
                    className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-1 text-[11px] text-fuchsia-200 transition-colors hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {hasMessages && (
          <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
            {messages.map((msg) => {
              const text = getMessageText(msg);
              const isUser = msg.role === "user";
              const isThisStreaming =
                isStreaming && lastIsAssistant && msg.id === lastMessage?.id;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-snug",
                      isUser
                        ? "bg-fuchsia-500/20 text-fuchsia-100"
                        : "border border-white/10 bg-black/30 text-foreground",
                    )}
                  >
                    {isThisStreaming && text === "" ? (
                      <TypingDots />
                    ) : (
                      <MessageText text={text} isStreaming={isThisStreaming} />
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isStreaming ? "L'IA répond…" : "Demande un conseil…"}
            disabled={isStreaming}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:border-fuchsia-500/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0 text-muted-foreground hover:text-red-400"
              onClick={stop}
              aria-label="Arrêter la génération"
            >
              <Square className="size-3.5" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0 text-muted-foreground hover:text-fuchsia-400 disabled:opacity-40"
              disabled={!input.trim()}
              aria-label="Envoyer"
            >
              <Send className="size-3.5" />
            </Button>
          )}
        </form>
      </div>
    </motion.div>
  );
}
