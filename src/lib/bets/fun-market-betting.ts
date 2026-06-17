import { toZonedTime } from "date-fns-tz";
import type { FunBettingPhase, FunMarket, MatchWithTeams } from "@/types/database";

export const FUN_LIVE_WINDOW_SECONDS = 120;

const PARIS_TZ = "Europe/Paris";

function kickoffStarted(isoDate: string, now: Date): boolean {
  return (
    toZonedTime(new Date(isoDate), PARIS_TZ).getTime() <=
    toZonedTime(now, PARIS_TZ).getTime()
  );
}

export function funBettingPhaseLabel(phase: FunBettingPhase): string {
  return phase === "live_window" ? "Live (2 min)" : "Pré-match";
}

export function funBettingPhaseDescription(phase: FunBettingPhase): string {
  return phase === "live_window"
    ? "Paris ouverts 2 minutes en direct, puis fermés automatiquement."
    : "Paris fermés automatiquement au coup d'envoi.";
}

type MatchBettingContext = Pick<MatchWithTeams, "status" | "kickoff_at">;

export function isFunMarketBettingOpen(
  market: FunMarket,
  match: MatchBettingContext,
  now = new Date(),
): boolean {
  if (market.status !== "open") return false;

  const phase = market.betting_phase ?? "pre_match";

  if (phase === "pre_match") {
    return match.status === "scheduled" && !kickoffStarted(match.kickoff_at, now);
  }

  if (match.status !== "live") return false;
  if (!market.closes_at) return true;
  return new Date(market.closes_at).getTime() > now.getTime();
}

export function funMarketBettingClosedReason(
  market: FunMarket,
  match: MatchBettingContext,
  now = new Date(),
): string | null {
  if (market.status === "settled") {
    return "Ce pari fun est clôturé.";
  }
  if (market.status === "closed") {
    return "Les paris sont fermés — en attente du résultat admin.";
  }
  if (isFunMarketBettingOpen(market, match, now)) return null;

  const phase = market.betting_phase ?? "pre_match";
  if (phase === "pre_match") {
    return "Paris fermés au coup d'envoi.";
  }
  if (match.status !== "live") {
    return "Ce pari live n'est disponible qu'en direct.";
  }
  return "La fenêtre de 2 minutes est terminée.";
}

export function getLiveWindowRemainingSeconds(
  market: FunMarket,
  now = new Date(),
): number | null {
  if (market.betting_phase !== "live_window" || !market.closes_at) return null;
  const ms = new Date(market.closes_at).getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 1000);
}

export function funMarketClosesAtLabel(market: FunMarket): string | null {
  if (market.betting_phase !== "live_window" || !market.closes_at) return null;
  return new Date(market.closes_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
