import { generateMatchSummaryText } from "@/lib/ai/match-summary";

export interface AiChatContext {
  trigger: "kickoff" | "ambient";
  matchLabel: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  recentMessages: { author: string; message: string; is_ai?: boolean }[];
}

const CHAT_LLM_OPTIONS = { temperature: 1.05, maxTokens: 120 };

const KICKOFF_FALLBACKS = [
  "C'est parti les gars. J'ai mis mon prono, vous avez mis de la merde — on verra qui se fait humilier.",
  "Coup d'envoi. Le mur des chambrages est ouvert, préparez-vous à passer pour des clowns.",
  "Allez, le match démarre. Moi j'ai visé juste, vous vous êtes plantés en beauté comme d'hab.",
  "Go. Mon score exact est locké, le vôtre sent le pari fait au bar après trois pintes.",
];

const AMBIENT_FALLBACKS = [
  "Vous parlez fort pour des mecs qui ont sûrement tout foiré au pari.",
  "J'ai lu vos messages : niveau Ligue 2 des chambrages, j'adore.",
  "Continuez à vous envoyer des trucs nuls, je me marre derrière mon écran.",
  "Quelqu'un a dit un truc intelligent ? Non ? Bon bah je reste pour vous insulter gentiment.",
  "Franchement vos pronos puent autant que vos blagues, c'est cohérent.",
  "Le match avance, mes points aussi. Vous, vous galérez comme d'hab.",
];

const CHAT_PERSONA = `Tu es L'IA (pseudo ia_prono), le pote relou du pool de paris entre potes.
Tu écris sur le mur des chambrages pendant le match.
Ton : ultra familier, trash, vulgaire mais drôle — comme des mates qui se chambrrent au bar devant le match.
Utilise le tutoiement, l'argot, des gros mots légers (merde, connerie, nul à chier, se faire avoir, galère, etc.).
Chambre les pronos foireux, les messages ridicules, le score — avec humour, jamais méchant ni discriminatoire.
Pas de slurs, pas de haine, pas de sexisme. Pas de guillemets autour du message. Une seule phrase ou deux max.
Français uniquement.`;

function pickFallback(pool: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length]!;
}

function formatRecentLines(
  messages: AiChatContext["recentMessages"],
): string {
  const human = messages.filter((m) => !m.is_ai).slice(0, 5);
  if (human.length === 0) return "Aucun message récent.";
  return human
    .map((m) => `${m.author} : ${m.message}`)
    .reverse()
    .join("\n");
}

function buildChatPrompt(ctx: AiChatContext): { system: string; user: string } {
  const scoreLine =
    ctx.homeScore != null && ctx.awayScore != null
      ? `Score actuel : ${ctx.homeScore}-${ctx.awayScore}.`
      : "Score pas encore renseigné.";

  if (ctx.trigger === "kickoff") {
    return {
      system: `${CHAT_PERSONA}
Écris UN message court (max 180 caractères) pour lancer la chambrerie au coup d'envoi.
Moque les pronos des autres, annonce que le tien est solide, provoque-les.`,
      user: `Match : ${ctx.matchLabel}\n${scoreLine}\nStatut : ${ctx.status}`,
    };
  }

  return {
    system: `${CHAT_PERSONA}
Réponds aux messages récents avec UNE punchline courte (max 160 caractères).
Rebondis sur ce qu'ils disent, charrie-les, sois piquant. Ne répète pas mot pour mot.`,
    user: `Match : ${ctx.matchLabel}\n${scoreLine}\n\nMessages récents :\n${formatRecentLines(ctx.recentMessages)}`,
  };
}

export async function generateAiChatMessage(ctx: AiChatContext): Promise<string> {
  const hasLlmKey =
    Boolean(process.env.GROQ_API_KEY?.trim()) ||
    Boolean(process.env.GEMINI_API_KEY?.trim());

  const pool = ctx.trigger === "kickoff" ? KICKOFF_FALLBACKS : AMBIENT_FALLBACKS;
  const fallback = pickFallback(pool, `${ctx.matchLabel}-${ctx.trigger}`);

  if (!hasLlmKey) return fallback;

  const { system, user } = buildChatPrompt(ctx);

  try {
    const raw = await generateMatchSummaryText(system, user, CHAT_LLM_OPTIONS);
    const text = raw.replace(/^["'«]+|["'»]+$/g, "").trim();
    if (text.length >= 8 && text.length <= 500) return text;
  } catch {
    // fallback
  }

  return fallback;
}
