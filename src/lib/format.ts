import { formatDistance } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

const PARIS_TZ = "Europe/Paris";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Affichage des points (classement / gains potentiels). */
export function formatPoints(points: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(points);
}

export function formatKickoff(isoDate: string): string {
  return formatInTimeZone(new Date(isoDate), PARIS_TZ, "EEE d MMM · HH:mm", {
    locale: fr,
  });
}

export function formatKickoffRelative(isoDate: string): string {
  const zonedNow = toZonedTime(new Date(), PARIS_TZ);
  const zonedKickoff = toZonedTime(new Date(isoDate), PARIS_TZ);
  return formatDistance(zonedKickoff, zonedNow, {
    addSuffix: true,
    locale: fr,
  });
}

export type KickoffCountdown = {
  label: string;
  urgent: boolean;
  /** 0–1, remplissage de la barre dans les 24 h avant le coup d'envoi */
  progress: number;
};

/** Compte à rebours avant coup d'envoi (rafraîchir côté client chaque seconde). */
export function getKickoffCountdown(
  isoDate: string,
  now = new Date(),
): KickoffCountdown | null {
  const zonedNow = toZonedTime(now, PARIS_TZ);
  const zonedKickoff = toZonedTime(new Date(isoDate), PARIS_TZ);
  const diffMs = zonedKickoff.getTime() - zonedNow.getTime();

  if (diffMs <= 0) return null;

  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  const seconds = Math.floor((diffMs % 60_000) / 1_000);
  const urgent = diffMs < 3 * 3_600_000;
  const windowMs = 24 * 3_600_000;
  const progress =
    diffMs <= windowMs ? Math.min(1, Math.max(0, 1 - diffMs / windowMs)) : 0;

  if (hours >= 48) {
    return {
      label: formatDistance(zonedKickoff, zonedNow, { locale: fr }),
      urgent: false,
      progress: 0,
    };
  }

  if (hours >= 1) {
    return {
      label: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      urgent,
      progress,
    };
  }

  return {
    label: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    urgent: true,
    progress,
  };
}

/** Coup d'envoi atteint ou dépassé (heure de Paris) */
export function hasKickoffStarted(isoDate: string): boolean {
  const nowParis = toZonedTime(new Date(), PARIS_TZ).getTime();
  const kickoffParis = toZonedTime(new Date(isoDate), PARIS_TZ).getTime();
  return kickoffParis <= nowParis;
}

export function formatOdd(odd: number): string {
  return odd.toFixed(2);
}
