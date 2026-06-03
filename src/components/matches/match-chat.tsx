"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Send } from "lucide-react";
import { postMatchCommentAction, maybeTriggerAiChatAction } from "@/app/(app)/matches/actions";
import { AiPlayerBadge } from "@/components/leaderboard/ai-player-badge";
import { AI_CHAT_AMBIENT_DELAY_MS } from "@/lib/ai/chat-limits";
import { isAiPlayer } from "@/lib/ai/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getPlayerInitials,
  getPlayerLabel,
} from "@/lib/profile/player-label";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import type { MatchCommentRow } from "@/lib/match-comments";
import { cn } from "@/lib/utils";

interface MatchChatProps {
  matchId: number;
  currentUserId: string;
  initialComments: MatchCommentRow[];
}

function formatMessageTime(iso: string): string {
  return format(new Date(iso), "HH:mm", { locale: fr });
}

export function MatchChat({
  matchId,
  currentUserId,
  initialComments,
}: MatchChatProps) {
  const [comments, setComments] = useState<MatchCommentRow[]>(initialComments);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef(new Set(initialComments.map((c) => c.id)));
  const lastAiTriggerRef = useRef(0);
  const humanCountRef = useRef(
    initialComments.filter((c) => !isAiPlayer(c.user_id)).length,
  );

  const maybeAskAiToChimeIn = useCallback(() => {
    const now = Date.now();
    if (now - lastAiTriggerRef.current < AI_CHAT_AMBIENT_DELAY_MS) return;
    lastAiTriggerRef.current = now;
    void maybeTriggerAiChatAction(matchId);
  }, [matchId]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [comments, scrollToBottom]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      maybeAskAiToChimeIn();
    }, AI_CHAT_AMBIENT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [maybeAskAiToChimeIn]);

  useEffect(() => {
    const humanCount = comments.filter((c) => !isAiPlayer(c.user_id)).length;
    if (humanCount <= humanCountRef.current) return;
    humanCountRef.current = humanCount;
    if (humanCount >= 1) {
      maybeAskAiToChimeIn();
    }
  }, [comments, maybeAskAiToChimeIn]);

  const appendComment = useCallback((row: MatchCommentRow) => {
    if (seenIdsRef.current.has(row.id)) return;
    seenIdsRef.current.add(row.id);
    setComments((prev) => [...prev, row]);
  }, []);

  const fetchCommentWithProfile = useCallback(
    async (commentId: string) => {
      if (!hasSupabaseConfig) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("match_comments")
        .select(
          `
          id,
          match_id,
          user_id,
          message,
          created_at,
          profiles (display_name, username, avatar_url)
        `,
        )
        .eq("id", commentId)
        .single();

      if (!data) return;

      const r = data as Record<string, unknown>;
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      const p = profile as {
        display_name?: string | null;
        username?: string | null;
        avatar_url?: string | null;
      } | null;

      appendComment({
        id: r.id as string,
        match_id: r.match_id as number,
        user_id: r.user_id as string,
        message: r.message as string,
        created_at: r.created_at as string,
        display_name: p?.display_name ?? null,
        username: p?.username ?? null,
        avatar_url: p?.avatar_url ?? null,
      });
    },
    [appendComment],
  );

  useEffect(() => {
    if (!hasSupabaseConfig) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`match_comments:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_comments",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as { id?: string };
          if (row.id) {
            void fetchCommentWithProfile(row.id);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, fetchCommentWithProfile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    const result = await postMatchCommentAction(matchId, text);

    if (!result.success) {
      setError(result.error);
      setSending(false);
      return;
    }

    setMessage("");
    setSending(false);

    if (result.comment) {
      appendComment(result.comment);
    }

    maybeAskAiToChimeIn();
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Mur des chambrages</CardTitle>
        <p className="text-sm text-muted-foreground">
          Discutez en direct
        </p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-0 p-0">
        <div
          ref={scrollRef}
          className="flex max-h-[min(360px,50vh)] min-h-[200px] flex-1 flex-col gap-3 overflow-y-auto border-y border-border px-4 py-4"
        >
          {comments.length === 0 ? (
            <p className="m-auto text-center text-sm text-muted-foreground">
              Aucun message. Lancez la chambrerie !
            </p>
          ) : (
            comments.map((comment) => {
              const isOwn = comment.user_id === currentUserId;
              const isAi = isAiPlayer(comment.user_id);
              const label = getPlayerLabel(comment);
              const initials = getPlayerInitials(comment);

              return (
                <div
                  key={comment.id}
                  className={cn(
                    "flex gap-2",
                    isOwn ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <Avatar
                    size="sm"
                    className={cn(
                      "mt-0.5 shrink-0",
                      isAi && "ring-1 ring-violet-500/50",
                    )}
                  >
                    {comment.avatar_url ? (
                      <AvatarImage src={comment.avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="text-[10px] font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "flex max-w-[85%] flex-col gap-0.5",
                      isOwn ? "items-end" : "items-start",
                    )}
                  >
                    <span className="flex flex-wrap items-center gap-1 px-1 text-[10px] text-muted-foreground">
                      {isOwn ? "Vous" : label}
                      {isAi && <AiPlayerBadge className="scale-90" />}
                      {" · "}
                      {formatMessageTime(comment.created_at)}
                    </span>
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm leading-snug wrap-break-word",
                        isOwn
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : isAi
                            ? "rounded-bl-md border border-violet-500/25 bg-violet-500/10 text-foreground"
                            : "rounded-bl-md bg-muted text-foreground",
                      )}
                    >
                      {comment.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex shrink-0 items-center gap-2 border-t border-border bg-card p-3"
        >
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Votre message…"
            maxLength={500}
            disabled={sending}
            className="min-h-9 flex-1"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !message.trim()}
            aria-label="Envoyer"
          >
            <Send className="size-4" />
          </Button>
        </form>
        {error && (
          <p className="px-4 pb-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
