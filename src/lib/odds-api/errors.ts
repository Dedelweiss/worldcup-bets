export class OddsApiError extends Error {
  readonly status: number;
  readonly userMessage: string;

  constructor(status: number, userMessage: string, debugDetail?: string) {
    super(debugDetail ?? userMessage);
    this.name = "OddsApiError";
    this.status = status;
    this.userMessage = userMessage;
  }
}

function parseApiErrorBody(body: string): string | null {
  try {
    const json = JSON.parse(body) as { error?: string; message?: string };
    return json.error ?? json.message ?? null;
  } catch {
    return body.trim() || null;
  }
}

function formatRateLimitMessage(apiMessage: string): string {
  const limitMatch = apiMessage.match(/(\d+)\s*requests?\s*per\s*hour/i);
  const limit = limitMatch?.[1] ?? "100";

  const resetMatch = apiMessage.match(
    /resets?\s+in\s+(.+?)(?:\.|$)/i,
  );
  const resetIn = resetMatch?.[1]?.trim();

  if (resetIn) {
    return `Quota odds-api.io atteint (${limit} requêtes/heure sur votre offre). Réessayez dans ${resetIn}.`;
  }

  return `Quota odds-api.io atteint (${limit} requêtes/heure). Attendez une trentaine de minutes avant de relancer la sync.`;
}

export function toOddsApiUserMessage(
  status: number,
  body: string,
): string {
  const apiText = parseApiErrorBody(body) ?? body;

  switch (status) {
    case 401:
      return "Clé odds-api.io invalide ou expirée. Vérifiez ODDS_API_KEY dans vos variables d'environnement.";
    case 403:
      return "Accès odds-api.io refusé pour cette clé. Vérifiez votre abonnement sur odds-api.io.";
    case 404:
      return "Ressource introuvable sur odds-api.io (événement ou ligue peut-être absent).";
    case 429:
      return formatRateLimitMessage(apiText);
    default:
      if (status >= 500) {
        return "odds-api.io est temporairement indisponible. Réessayez dans quelques minutes.";
      }
      return apiText.length > 0 && apiText.length < 200
        ? apiText
        : `Erreur odds-api.io (${status}).`;
  }
}

export function throwOddsApiHttpError(status: number, body: string): never {
  const userMessage = toOddsApiUserMessage(status, body);
  throw new OddsApiError(status, userMessage, `odds-api.io ${status}: ${body.slice(0, 200)}`);
}

export function formatOddsApiError(error: unknown): string {
  if (error instanceof OddsApiError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    const m = error.message;
    const rateMatch = m.match(/429[:\s]*\{?"error":"([^"]+)"/);
    if (rateMatch) {
      return formatRateLimitMessage(rateMatch[1]!);
    }
    if (m.includes("429") || /rate limit/i.test(m)) {
      return formatRateLimitMessage(m);
    }
    if (m.includes("ODDS_API_KEY")) {
      return "Clé ODDS_API_KEY manquante ou non configurée.";
    }
  }
  return "La synchronisation des cotes odds-api.io a échoué. Réessayez plus tard.";
}
