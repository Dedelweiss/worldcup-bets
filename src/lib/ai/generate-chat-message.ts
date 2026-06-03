import { generateMatchSummaryText } from "@/lib/ai/match-summary";

export interface AiChatContext {
  trigger: "kickoff" | "ambient";
  matchLabel: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  /** Score exact parié par l'IA sur ce match (obligatoire pour rester cohérent). */
  aiBetHome: number | null;
  aiBetAway: number | null;
  recentMessages: { author: string; message: string; is_ai?: boolean }[];
}

const CHAT_LLM_OPTIONS = { temperature: 0.85, maxTokens: 120 };

const CHAT_PERSONA = `Tu es L'IA (pseudo ia_prono), le pote relou du pool de paris entre potes.
Tu écris sur le mur des chambrages pendant le match.
Ton : ultra familier, trash, vulgaire mais drôle — comme des mates qui se chambrrent au bar.
Utilise le tutoiement, l'argot, des gros mots légers. Jamais méchant ni discriminatoire.
Pas de guillemets autour du message. Une seule phrase ou deux max. Français uniquement.`;

function formatAiBetLine(ctx: AiChatContext): string | null {
  if (ctx.aiBetHome == null || ctx.aiBetAway == null) return null;
  return `TON pronostic officiel (score exact enregistré) : ${ctx.aiBetHome}-${ctx.aiBetAway}. Tu DOIS t'y tenir : ne cite aucun autre score comme étant le tien.`;
}

function pickFallback(pool: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length]!;
}

function kickoffFallback(ctx: AiChatContext): string {
  const h = ctx.aiBetHome;
  const a = ctx.aiBetAway;
  if (h != null && a != null) {
    const pool = [
      `C'est parti. J'ai locké ${h}-${a}, préparez-vous à pleurer.`,
      `Go. Mon prono c'est ${h}-${a}, le vôtre sent la lose.`,
      `Match lancé : moi j'ai mis ${h}-${a}, vous allez vous faire humilier.`,
      `${h}-${a} chez moi. Chambrerie ouverte, bonne chance les losers.`,
    ];
    return pickFallback(pool, `${ctx.matchLabel}-kickoff-${h}-${a}`);
  }
  return pickFallback(
    ["C'est parti. Mon prono est locké, le vôtre pue."],
    `${ctx.matchLabel}-kickoff`,
  );
}

function ambientFallback(ctx: AiChatContext): string {
  const h = ctx.aiBetHome;
  const a = ctx.aiBetAway;
  const live =
    ctx.homeScore != null && ctx.awayScore != null
      ? ` (${ctx.homeScore}-${ctx.awayScore} en ce moment)`
      : "";

  if (h != null && a != null) {
    const pool = [
      `J'ai mis ${h}-${a}${live}, vous parlez fort pour des mecs qui ont foiré leur prono.`,
      `Mon ${h}-${a} tient la route${live}. Continuez à vous envoyer des conneries.`,
      `Avec mon ${h}-${a} je suis tranquille${live}. Vos messages, niveau Ligue 2.`,
      `${h}-${a} de mon côté${live} — vous chambrer, moi je vais encaisser les points.`,
    ];
    return pickFallback(pool, `${ctx.matchLabel}-ambient-${h}-${a}-${live}`);
  }

  return pickFallback(
    [
      "Vous parlez fort pour des mecs qui ont sûrement tout foiré au pari.",
      "Continuez, je me marre pendant que mon prono fait le taf.",
    ],
    `${ctx.matchLabel}-ambient`,
  );
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
      ? `Score actuel du match : ${ctx.homeScore}-${ctx.awayScore}.`
      : "Score du match pas encore renseigné.";

  const betLine = formatAiBetLine(ctx);
  const betBlock = betLine ? `\n${betLine}` : "";

  if (ctx.trigger === "kickoff") {
    return {
      system: `${CHAT_PERSONA}
Écris UN message court (max 180 caractères) au coup d'envoi.
Annonce clairement TON score exact (celui indiqué ci-dessous), chambrre les autres.
INTERDIT d'inventer un autre score que ton prono officiel.`,
      user: `Match : ${ctx.matchLabel}\n${scoreLine}${betBlock}\nStatut : ${ctx.status}`,
    };
  }

  return {
    system: `${CHAT_PERSONA}
Réponds aux messages récents avec UNE punchline courte (max 160 caractères).
Tu peux comparer le score live à TON prono officiel ci-dessous, chambrer les gens — mais ne change jamais ton prono.
INTERDIT de citer un score différent de ton prono enregistré.`,
    user: `Match : ${ctx.matchLabel}\n${scoreLine}${betBlock}\n\nMessages récents :\n${formatRecentLines(ctx.recentMessages)}`,
  };
}

export async function generateAiChatMessage(ctx: AiChatContext): Promise<string> {
  const hasLlmKey =
    Boolean(process.env.GROQ_API_KEY?.trim()) ||
    Boolean(process.env.GEMINI_API_KEY?.trim());

  const fallback =
    ctx.trigger === "kickoff" ? kickoffFallback(ctx) : ambientFallback(ctx);

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
