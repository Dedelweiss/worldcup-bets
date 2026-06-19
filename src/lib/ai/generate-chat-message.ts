import { isAiConfigured } from "@/lib/ai/constants";
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

const CHAT_LLM_OPTIONS = { temperature: 0.92, maxTokens: 160 };

const CHAT_PERSONA = `Tu es L'IA (pseudo ia_prono), le pote relou du pool de paris entre potes.
Tu écris sur le mur des chambrages pendant le match.
Ton : familier, trash, drôle — comme des mates au bar. Tutoiement, argot, gros mots légers OK.
Jamais méchant, haineux ni discriminatoire. Pas de guillemets autour du message. Français uniquement.

FORME OBLIGATOIRE : une réplique de chat brute, comme sur WhatsApp.
INTERDIT de commencer par "pseudo :", "@pseudo :", "Joueur :" ou de recopier le format du fil.
Pour parler à quelqu'un, intègre son prénom/pseudo DANS la phrase ("T'inquiète Lucas…", "Ah toi tu y crois encore") — optionnel, pas systématique.`;

function formatAiBetLine(ctx: AiChatContext): string | null {
  if (ctx.aiBetHome == null || ctx.aiBetAway == null) return null;
  return `TON pronostic officiel (score exact enregistré) : ${ctx.aiBetHome}-${ctx.aiBetAway}. Ne cite aucun autre score comme étant le tien.`;
}

function splitMessages(messages: AiChatContext["recentMessages"]) {
  const newestFirst = [...messages];
  const chronological = [...newestFirst].reverse();
  const humans = chronological.filter((m) => !m.is_ai);
  const ai = chronological.filter((m) => m.is_ai);
  return {
    lastHuman: humans.at(-1) ?? null,
    lastAi: ai.at(-1) ?? null,
    humans,
  };
}

function describePronoVsScore(ctx: AiChatContext): string | null {
  const { aiBetHome, aiBetAway, homeScore, awayScore } = ctx;
  if (aiBetHome == null || aiBetAway == null) return null;

  if (homeScore == null || awayScore == null) {
    return `Ton prono officiel : ${aiBetHome}-${aiBetAway}. Score live pas encore affiché.`;
  }

  const exact = homeScore === aiBetHome && awayScore === aiBetAway;
  const pronoMargin = aiBetHome - aiBetAway;
  const liveMargin = homeScore - awayScore;

  if (exact) {
    return `Score live ${homeScore}-${awayScore} : c'est pile ton prono. Fais-en une vanne, pas besoin de répéter le score en boucle.`;
  }
  if (Math.sign(pronoMargin) === Math.sign(liveMargin) && pronoMargin !== 0) {
    return `Score live ${homeScore}-${awayScore}, ton prono ${aiBetHome}-${aiBetAway} : la tendance te sourit.`;
  }
  if (liveMargin === 0 && pronoMargin !== 0) {
    return `Score live ${homeScore}-${awayScore}, tu avais parié ${aiBetHome}-${aiBetAway} : match nul pour l'instant.`;
  }
  return `Score live ${homeScore}-${awayScore}, ton prono ${aiBetHome}-${aiBetAway} : ça ne colle pas trop — adapte ta réplique au contexte.`;
}

function chatFirstName(author: string): string {
  const base = author.split("@")[0]?.trim() || author;
  if (!base) return author;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Retire les préfixes "pseudo :" que le modèle recopie parfois du fil. */
function sanitizeChatMessage(
  text: string,
  knownAuthors: string[],
): string {
  let out = text.trim();
  const names = new Set<string>();
  for (const author of knownAuthors) {
    names.add(author);
    const base = author.split("@")[0]?.trim();
    if (base) {
      names.add(base);
      names.add(chatFirstName(base));
    }
  }
  names.add("ia_prono");

  for (const name of names) {
    const re = new RegExp(`^${escapeRegExp(name)}\\s*:\\s*`, "i");
    out = out.replace(re, "");
  }

  return out.trim();
}

function formatConversationForPrompt(
  messages: AiChatContext["recentMessages"],
): string {
  const { lastHuman, lastAi, humans } = splitMessages(messages);
  if (humans.length === 0) {
    return "Aucun message humain récent — lance une vanne générale sur le match ou le pool.";
  }

  const thread = humans
    .slice(-6)
    .map((m) => `• ${chatFirstName(m.author)} a dit : « ${m.message} »`)
    .join("\n");

  const replyBlock = lastHuman
    ? `>>> Réponds naturellement à ${chatFirstName(lastHuman.author)} (rebondis sur le fond, sans préfixer ta réplique par son pseudo) :
« ${lastHuman.message} »`
    : "";

  const avoidBlock = lastAi
    ? `\n>>> Ne recopie pas ta réplique précédente :
« ${lastAi.message} »`
    : "";

  return `${replyBlock}\n\nFil récent (du plus ancien au plus récent) :\n${thread}${avoidBlock}`;
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
      `C'est parti sur ${ctx.matchLabel}. Moi j'ai locké ${h}-${a}, à vous de jouer.`,
      `Allez, ${ctx.matchLabel} est lancé — mon ${h}-${a} va vous faire mal.`,
      `Go. ${h}-${a} pour moi, que le meilleur prono gagne (spoiler : c'est le mien).`,
      `${ctx.matchLabel} : j'annonce ${h}-${a}. Chambrerie ouverte.`,
    ];
    return pickFallback(pool, `${ctx.matchLabel}-kickoff-${h}-${a}`);
  }
  return pickFallback(
    ["C'est parti. Le mur est ouvert, montrez-moi vos pronos de cave."],
    `${ctx.matchLabel}-kickoff`,
  );
}

function ambientFallback(ctx: AiChatContext): string {
  const { lastHuman } = splitMessages(ctx.recentMessages);
  const name = lastHuman ? chatFirstName(lastHuman.author) : null;
  const msg = lastHuman?.message?.toLowerCase() ?? "";

  if (lastHuman && name) {
    if (msg.includes("?")) {
      return pickFallback(
        [
          `Bonne question… dommage d'y penser après ton prono foireux.`,
          `Tu demandes ça maintenant ${name} ? T'aurais dû réfléchir avant de parier.`,
        ],
        `${name}-question-${msg.slice(0, 24)}`,
      );
    }
    if (/goal|but|banger|dingue|fou|incroyable/i.test(msg)) {
      return pickFallback(
        [
          `Ouais c'était chaud — moi je reste zen sur mon prono.`,
          `Le but t'a excité ? Respire ${name}, le match est loin d'être plié.`,
        ],
        `${name}-goal-${ctx.homeScore}-${ctx.awayScore}`,
      );
    }
    return pickFallback(
      [
        `J'ai lu ${name} — maintenant explique-moi comment ton prono tient encore.`,
        `Message reçu. La qualité du prono, par contre, on repassera.`,
        `Tu parles fort pour quelqu'un qui doit suer devant le score.`,
        `Ok, note prise — moi je commente le match, toi tu gères ta lose.`,
      ],
      `${name}-${msg.slice(0, 32)}-${ctx.homeScore}`,
    );
  }

  const h = ctx.aiBetHome;
  const a = ctx.aiBetAway;
  const live =
    ctx.homeScore != null && ctx.awayScore != null
      ? ` ${ctx.homeScore}-${ctx.awayScore}`
      : "";

  if (h != null && a != null) {
    return pickFallback(
      [
        `Le mur s'anime${live ? ` (${live.trim()})` : ""} — qui a foiré son prono ?`,
        `Vous parlez tous en même temps, c'est mignon.${live ? ` Score :${live}.` : ""}`,
      ],
      `${ctx.matchLabel}-ambient-general-${live}`,
    );
  }

  return pickFallback(
    ["Le chat chauffe — quelqu'un a un avis ou on continue à se mentir ?"],
    `${ctx.matchLabel}-ambient`,
  );
}

function buildChatPrompt(ctx: AiChatContext): { system: string; user: string } {
  const scoreLine =
    ctx.homeScore != null && ctx.awayScore != null
      ? `Score actuel : ${ctx.homeScore}-${ctx.awayScore}.`
      : "Score pas encore renseigné.";

  const betLine = formatAiBetLine(ctx);
  const betBlock = betLine ? `\n${betLine}` : "";
  const pronoContext = describePronoVsScore(ctx);
  const pronoBlock = pronoContext ? `\n${pronoContext}` : "";

  if (ctx.trigger === "kickoff") {
    return {
      system: `${CHAT_PERSONA}
Écris UN message d'ouverture (max 200 caractères) au coup d'envoi.
Annonce ton score exact UNE fois, avec une touche perso (vanne sur le match ou le pool).
Évite les formules génériques type "préparez-vous à pleurer".`,
      user: `Match : ${ctx.matchLabel}\n${scoreLine}${betBlock}\nStatut : ${ctx.status}`,
    };
  }

  return {
    system: `${CHAT_PERSONA}
Tu interviens dans une conversation EN DIRECT. Écris 1 à 2 phrases (max 200 caractères).

Règles :
- Réponds au dernier message humain en rebondissant sur le fond (question, vanne, but, plainte…).
- Parle comme dans un groupe WhatsApp : pas de "pseudo :" au début, pas de narration.
- Tu peux interpeller la personne par son prénom dans la phrase, mais ce n'est pas obligatoire.
- Ne répète pas ton prono/score à chaque message — seulement si pertinent.
- Varie le style. Ne recopie pas ta réplique précédente.
- Ton prono officiel ne change jamais.`,
    user: `Match : ${ctx.matchLabel} (${ctx.status})
${scoreLine}${betBlock}${pronoBlock}

${formatConversationForPrompt(ctx.recentMessages)}`,
  };
}

export async function generateAiChatMessage(ctx: AiChatContext): Promise<string> {
  const hasLlmKey = isAiConfigured();

  const fallback =
    ctx.trigger === "kickoff" ? kickoffFallback(ctx) : ambientFallback(ctx);

  if (!hasLlmKey) return fallback;

  const { system, user } = buildChatPrompt(ctx);

  const authorNames = ctx.recentMessages
    .filter((m) => !m.is_ai)
    .map((m) => m.author);

  try {
    const raw = await generateMatchSummaryText(system, user, CHAT_LLM_OPTIONS);
    const text = sanitizeChatMessage(
      raw.replace(/^["'«]+|["'»]+$/g, "").trim(),
      authorNames,
    );
    if (text.length >= 8 && text.length <= 500) return text;
  } catch {
    // fallback
  }

  return fallback;
}
