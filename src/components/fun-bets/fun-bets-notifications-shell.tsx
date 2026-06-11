"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { BadgeUnlockCelebration } from "@/components/badges/badge-unlock-celebration";
import { FunBetsNotificationsProvider } from "@/components/fun-bets/fun-bets-notifications-context";
import { LiveMatchNotifier } from "@/components/live/live-match-notifier";
import { useFunBetsNotifications } from "@/hooks/use-fun-bets-notifications";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/env";

function FunBetsRealtimeListener() {
  useFunBetsNotifications(true);
  return null;
}

export function FunBetsNotificationsShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(!!data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <FunBetsNotificationsProvider>
      {authenticated && <FunBetsRealtimeListener />}
      {authenticated && <LiveMatchNotifier />}
      {authenticated && <BadgeUnlockCelebration />}
      <Toaster richColors closeButton />
      {children}
    </FunBetsNotificationsProvider>
  );
}
