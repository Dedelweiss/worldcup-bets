import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatKickoff(isoDate: string): string {
  return format(new Date(isoDate), "EEE d MMM · HH:mm", { locale: fr });
}

export function formatKickoffRelative(isoDate: string): string {
  return formatDistanceToNow(new Date(isoDate), {
    addSuffix: true,
    locale: fr,
  });
}

export function formatOdd(odd: number): string {
  return odd.toFixed(2);
}
