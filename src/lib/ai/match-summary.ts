import type { MatchResultSelection } from "@/types/database";

export interface SummaryBetRow {
  username: string | null;
  display_name: string | null;
  bet_type: "match_result" | "exact_score";
  selection: Record<string, unknown>;
}

const RESULT_LABEL: Record<MatchResultSelection, string> = {
  home: "victoire domicile",
  draw: "match nul",
  away: "victoire extérieur",
};

export function playerLabel(row: SummaryBetRow): string {
  return row.username ?? row.display_name ?? "Joueur anonyme";
}

export function formatBetForSummary(row: SummaryBetRow): string {
  const name = playerLabel(row);
  if (row.bet_type === "match_result") {
    const sel = row.selection.selection as MatchResultSelection | undefined;
    const label = sel ? RESULT_LABEL[sel] ?? sel : "inconnu";
    return `${name} : ${label}`;
  }
  const home = row.selection.home;
  const away = row.selection.away;
  return `${name} : score ${home}-${away}`;
}

export function buildSummaryPrompt(
  matchLabel: string,
  bets: SummaryBetRow[],
): { system: string; user: string } {
  const lines = bets.map(formatBetForSummary).join("\n");

  return {
    system:
      "Tu es un commentateur de foot sarcastique. Voici les pronostics d'un groupe d'amis pour le match à venir. Fais un résumé très court (3 phrases max), chambre celui qui a fait le prono le plus absurde, et souligne la tendance générale. Sois piquant et familier. Réponds en français.",
    user: `Match : ${matchLabel}\n\nPronostics :\n${lines || "Aucun pronostic pour l'instant."}`,
  };
}

export async function callGroq(
  system: string,
  user: string,
  apiKey: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: options?.temperature ?? 0.9,
      max_tokens: options?.maxTokens ?? 280,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned an empty summary");
  return text;
}

export async function callGemini(
  system: string,
  user: string,
  apiKey: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  const res = await fetch(`${url}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.9,
        maxOutputTokens: options?.maxTokens ?? 280,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini returned an empty summary");
  return text;
}

export async function generateMatchSummaryText(
  system: string,
  user: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (groqKey) {
    try {
      return await callGroq(system, user, groqKey, options);
    } catch (err) {
      if (!geminiKey) throw err;
    }
  }

  if (geminiKey) {
    return callGemini(system, user, geminiKey, options);
  }

  throw new Error(
    "Aucune clé API LLM configurée (GROQ_API_KEY ou GEMINI_API_KEY).",
  );
}
