import { Suspense } from "react";
import { BetList } from "@/components/bets/bet-list";
import { CancelAllNonLiveBetsButton } from "@/components/bets/cancel-all-non-live-bets-button";
import { ShareBetSlipButton } from "@/components/bets/share-bet-slip-button";
import { LiveStatusPoller } from "@/components/dashboard/live-status-poller";
import { requireAuth } from "@/lib/auth-server";
import { getUserBets } from "@/lib/bets";
import { ON_FIRE_STREAK_REQUIRED } from "@/lib/on-fire";
import { getPlayerLabel } from "@/lib/profile/player-label";

export const metadata = { title: "Mes paris · WC2026 Pool" };

export default async function BetsPage() {
  const profile = await requireAuth();
  const bets = await getUserBets(profile.id);

  const pending = bets.filter((b) => b.status === "pending").length;
  const settled = bets.filter(
    (b) => b.status === "won" || b.status === "lost",
  ).length;
  const liveNow = bets.filter(
    (b) => b.status === "pending" && b.match?.status === "live",
  ).length;
  const onFire =
    Boolean(profile.on_fire) ||
    (profile.heat_streak ?? 0) >= ON_FIRE_STREAK_REQUIRED;
  const playerName = getPlayerLabel(profile);

  return (
    <div className="space-y-6">
      {pending > 0 && <LiveStatusPoller />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Mes paris</h1>
          <p className="text-sm text-muted-foreground">
            Filtre par onglet · {pending} en cours
            {liveNow > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="text-lime-400">
                  {liveNow} en direct
                </span>
              </>
            )}
            {" "}
            · {settled} terminé{settled !== 1 ? "s" : ""} (gagnés ou perdus)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareBetSlipButton
            playerName={playerName}
            bets={bets}
            onFire={onFire}
          />
          <CancelAllNonLiveBetsButton bets={bets} />
        </div>
      </div>
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Chargement des paris…</p>
        }
      >
        <BetList bets={bets} />
      </Suspense>
    </div>
  );
}
