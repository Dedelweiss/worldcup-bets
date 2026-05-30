import { format, formatDistance } from "date-fns";
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

/** Coup d'envoi atteint ou dépassé (heure de Paris) */
export function hasKickoffStarted(isoDate: string): boolean {
  const nowParis = toZonedTime(new Date(), PARIS_TZ).getTime();
  const kickoffParis = toZonedTime(new Date(isoDate), PARIS_TZ).getTime();
  return kickoffParis <= nowParis;
}

export function formatOdd(odd: number): string {
  return odd.toFixed(2);
}
