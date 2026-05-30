"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFunBetsNotificationsContext } from "@/components/fun-bets/fun-bets-notifications-context";
import { FUN_BET_TOAST_GROUP_MS } from "@/lib/fun-bets/constants";
import { fetchMatchLabel } from "@/lib/fun-bets/match-label";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import type { FunMarket } from "@/types/database";

type PendingGroup = {
  matchId: number;
  marketIds: string[];
  matchLabel: string;
  timeoutId: ReturnType<typeof setTimeout>;
  startedAt: number;
};

type FunMarketRow = Pick<
  FunMarket,
  "id" | "match_id" | "status" | "created_at"
> & {
  created_by?: string | null;
};

export function useFunBetsNotifications(enabled = true) {
  const router = useRouter();
  const pathname = usePathname();
  const { registerUnread } = useFunBetsNotificationsContext();
  const pathnameRef = useRef(pathname);
  const matchLabelsRef = useRef<Map<number, string>>(new Map());
  const pendingGroupsRef = useRef<Map<number, PendingGroup>>(new Map());
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!enabled || !hasSupabaseConfig) return;

    const supabase = createClient();
    let cancelled = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        userIdRef.current = data.user?.id ?? null;
      }
    });

    const flushGroup = (matchId: number) => {
      const group = pendingGroupsRef.current.get(matchId);
      if (!group) return;
      clearTimeout(group.timeoutId);
      pendingGroupsRef.current.delete(matchId);

      const count = group.marketIds.length;
      const label = group.matchLabel;
      const message =
        count === 1
          ? `Nouveau pari fun disponible sur ${label} !`
          : `${count} nouveaux paris fun disponibles sur ${label} !`;

      const onMatchPage =
        pathnameRef.current === `/matches/${matchId}` ||
        pathnameRef.current.startsWith(`/matches/${matchId}/`);

      if (!onMatchPage) {
        toast(message, {
          duration: 6000,
          action: {
            label: "Voir le pari",
            onClick: () => {
              router.push(`/matches/${matchId}#paris-fun`);
            },
          },
        });
      }
    };

    const scheduleFlush = (matchId: number, group: PendingGroup) => {
      const elapsed = Date.now() - group.startedAt;
      const remaining = Math.max(0, FUN_BET_TOAST_GROUP_MS - elapsed);
      clearTimeout(group.timeoutId);
      group.timeoutId = setTimeout(() => flushGroup(matchId), remaining);
    };

    const handleInsert = async (row: FunMarketRow) => {
      if (row.status !== "open") return;
      if (row.created_by && row.created_by === userIdRef.current) return;

      let matchLabel = matchLabelsRef.current.get(row.match_id);
      if (!matchLabel) {
        matchLabel = await fetchMatchLabel(supabase, row.match_id);
        matchLabelsRef.current.set(row.match_id, matchLabel);
      }

      registerUnread({
        marketId: row.id,
        matchId: row.match_id,
        createdAt: row.created_at,
      });

      const existing = pendingGroupsRef.current.get(row.match_id);
      if (existing) {
        if (!existing.marketIds.includes(row.id)) {
          existing.marketIds.push(row.id);
        }
        scheduleFlush(row.match_id, existing);
        return;
      }

      const group: PendingGroup = {
        matchId: row.match_id,
        marketIds: [row.id],
        matchLabel,
        startedAt: Date.now(),
        timeoutId: setTimeout(() => {}, FUN_BET_TOAST_GROUP_MS),
      };
      pendingGroupsRef.current.set(row.match_id, group);
      scheduleFlush(row.match_id, group);
    };

    const channel = supabase
      .channel("fun_markets_inserts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fun_markets",
        },
        (payload) => {
          void handleInsert(payload.new as FunMarketRow);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      for (const group of pendingGroupsRef.current.values()) {
        clearTimeout(group.timeoutId);
      }
      pendingGroupsRef.current.clear();
      void supabase.removeChannel(channel);
    };
  }, [enabled, registerUnread, router]);
}
