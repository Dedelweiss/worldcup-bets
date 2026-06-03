"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GLOBAL_LIVE_CHAT_COMMENT_SELECT,
  mapGlobalLiveChatRow,
  type GlobalLiveChatMessage,
} from "@/lib/global-live-chat";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/env";

const MAX_MESSAGES = 50;
const LIVE_MATCHS_REFRESH_MS = 30_000;

interface UseGlobalChatOptions {
  initialMessages: GlobalLiveChatMessage[];
  initialLiveMatchIds: number[];
  enabled?: boolean;
}

export function useGlobalChat({
  initialMessages,
  initialLiveMatchIds,
  enabled = true,
}: UseGlobalChatOptions) {
  const [messages, setMessages] = useState(initialMessages);
  const [liveMatchIds, setLiveMatchIds] = useState(initialLiveMatchIds);
  const seenIdsRef = useRef(new Set(initialMessages.map((m) => m.id)));
  const initialIdsRef = useRef(new Set(initialMessages.map((m) => m.id)));
  const liveMatchIdsRef = useRef(new Set(initialLiveMatchIds));

  useEffect(() => {
    liveMatchIdsRef.current = new Set(liveMatchIds);
  }, [liveMatchIds]);

  const refreshLiveMatchIds = useCallback(async () => {
    if (!hasSupabaseConfig) return;
    const supabase = createClient();
    const { data } = await supabase.from("matches").select("id").eq("status", "live");
    const ids = (data ?? []).map((row) => row.id as number);
    setLiveMatchIds(ids);
  }, []);

  const appendMessage = useCallback((message: GlobalLiveChatMessage) => {
    if (seenIdsRef.current.has(message.id)) return;
    seenIdsRef.current.add(message.id);
    setMessages((prev) => {
      const next = [...prev, message];
      return next.length > MAX_MESSAGES
        ? next.slice(next.length - MAX_MESSAGES)
        : next;
    });
  }, []);

  const fetchMessage = useCallback(
    async (commentId: string) => {
      if (!hasSupabaseConfig) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("match_comments")
        .select(GLOBAL_LIVE_CHAT_COMMENT_SELECT)
        .eq("id", commentId)
        .single();

      if (!data) return;

      const mapped = mapGlobalLiveChatRow(data);
      if (!mapped) return;

      appendMessage(mapped);
    },
    [appendMessage],
  );

  useEffect(() => {
    if (!enabled || !hasSupabaseConfig) return;

    void refreshLiveMatchIds();
    const refreshId = window.setInterval(
      () => void refreshLiveMatchIds(),
      LIVE_MATCHS_REFRESH_MS,
    );

    const supabase = createClient();
    const channel = supabase
      .channel("global_live_chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_comments",
        },
        (payload) => {
          const row = payload.new as { id?: string };
          if (!row.id) return;
          void fetchMessage(row.id);
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(refreshId);
      void supabase.removeChannel(channel);
    };
  }, [enabled, fetchMessage, refreshLiveMatchIds]);

  const visibleMessages = messages.filter((m) =>
    liveMatchIds.includes(m.match_id),
  );

  return {
    messages: visibleMessages,
    liveMatchIds,
    liveMatchCount: liveMatchIds.length,
    isNewMessage: (id: string) => !initialIdsRef.current.has(id),
  };
}
