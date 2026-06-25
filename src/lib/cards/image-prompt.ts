import { normalizeCategory, type CardCategory } from "@/lib/cards/card-categories";
import { iso2ToName } from "@/lib/cards/nations";
import { getStarTier } from "@/lib/cards/player-stars";
import { RARITY_LABEL } from "@/lib/cards/styles";
import type { CardRarity } from "@/lib/cards/types";

/** Limite API Leonardo (caractères). */
export const LEONARDO_MAX_PROMPT_LENGTH = 1500;

export interface CardImagePromptInput {
  code?: string | null;
  name: string;
  category: string | null;
  country_code: string | null;
  position: string | null;
  rarity: CardRarity;
  stats?: {
    subtitle?: string | null;
    icon?: string | null;
    decade?: string | null;
  } | null;
}

const STYLE =
  "Street-art vector illustration, 3:4 full-bleed artwork, flat bold colors, thick outlines, not photorealistic, pure artwork with zero typography.";

const GENERIC_HUMAN =
  "Generic stylized figures, abstract faces, no celebrity likeness.";

const JOUEUR_STYLE =
  "Caricature footballer, loosely recognizable via hairstyle, build, and pose only.";

const AVOID =
  "No FIFA logos, federation crests, sponsors, watermarks, captions, or any readable text anywhere.";

/** Negative prompt Leonardo — renforce l'absence de texte/nom sur l'illustration. */
export const LEONARDO_NEGATIVE_PROMPT =
  "text, words, letters, numbers, digits, typography, font, caption, title, title bar, name banner, label, player name, surname, first name, jersey name, nameplate, shirt number, squad number, watermark, autograph, signature, trading card text, UI overlay, speech bubble, newspaper, scoreboard";

const JOUEUR_AVOID =
  "Blank plain jersey with no writing. No name or number anywhere in the artwork.";

function colorHint(countryCode: string | null): string {
  const nation = countryCode ? iso2ToName(countryCode) : null;
  return nation ? `${nation} team colors` : "Vibrant flat palette";
}

function shortRole(position: string | null): string {
  const p = position?.trim();
  if (!p) return "player";
  if (p.length <= 24) return p.toLowerCase();
  return p.slice(0, 21).trimEnd() + "…";
}

function buildObjetSubject(
  code: string | null | undefined,
  name: string,
  icon?: string | null,
): string {
  const key = (code ?? name).toLowerCase();

  if (key.includes("var") || name.toLowerCase() === "var") {
    return `VAR tech scene: review monitors, pitch graphics, referee silhouette. Not a player portrait. "${name}".`;
  }

  if (key.includes("whistle") || name.toLowerCase().includes("sifflet")) {
    return `Referee whistle vector icon, "${name}", motion lines, no human portrait.`;
  }

  if (key.includes("ball") || name.toLowerCase().includes("ballon") || icon === "ball") {
    return `Stylized football hero shot, "${name}", geometric motion, no players.`;
  }

  return `Football object "${name}", symbolic vector centerpiece.`;
}

function buildStadeSubject(card: CardImagePromptInput): string {
  const place = card.stats?.subtitle?.trim();
  const where = place ? ` (${place})` : "";
  return `Stadium "${card.name}"${where}, geometric exterior, flat crowd blocks.`;
}

function buildLegendeSubject(card: CardImagePromptInput): string {
  const decade = card.stats?.decade ?? card.stats?.subtitle ?? "classic";
  return `"${card.name}", dream-team silhouettes, ${decade} retro, tiny generic players.`;
}

function buildSpecialSubject(card: CardImagePromptInput): string {
  const name = card.name.toLowerCase();
  if (name.includes("12") || card.stats?.icon === "crowd") {
    return `"${card.name}", stadium crowd energy, abstract silhouettes and flags.`;
  }
  return `"${card.name}", symbolic World Cup street-art scene.`;
}

function buildTropheeSubject(card: CardImagePromptInput): string {
  return `"${card.name}", golden trophy vector icon, generic cup, light rays, no engraving.`;
}

function buildNationSubject(card: CardImagePromptInput, nation: string | null): string {
  return `${nation ?? card.name} national identity, flag-inspired geometric shapes, no faces or federation logo.`;
}

/** Indices visuels sans envoyer le nom du joueur à Leonardo (évite le texte sur l'image). */
function joueurFameCue(name: string, rarity: CardRarity): string {
  const tier = getStarTier(name);
  if (tier === "superstar") {
    return "iconic superstar energy, memorable celebration pose";
  }
  if (tier === "star") {
    return "top international pro, confident match action";
  }
  if (rarity === "legendaire") {
    return "legendary presence, heroic dynamic pose";
  }
  return "national squad player, energetic movement";
}

function buildJoueurSubject(
  card: CardImagePromptInput,
  nation: string | null,
): string {
  const role = shortRole(card.position);
  const team = nation ?? "international";
  const fame = joueurFameCue(card.name, card.rarity);
  return [
    `Stylized ${role} for ${team} team. ${fame}.`,
    "Dynamic action, plain blank jersey, no logos or writing.",
    "Comic caricature face, simplified evocative features, artwork only.",
  ].join(" ");
}

function buildSubject(card: CardImagePromptInput, cat: CardCategory | "autre"): string {
  const icon = card.stats?.icon;

  if (cat === "objet") return buildObjetSubject(card.code, card.name, icon);
  if (cat === "stade") return buildStadeSubject(card);
  if (cat === "legende") return buildLegendeSubject(card);
  if (cat === "special") return buildSpecialSubject(card);
  if (cat === "trophee") return buildTropheeSubject(card);

  const nation = card.country_code
    ? (iso2ToName(card.country_code) ?? card.country_code.toUpperCase())
    : null;

  if (cat === "nation") return buildNationSubject(card, nation);
  if (cat === "joueur") return buildJoueurSubject(card, nation);

  const fallback = card.stats?.subtitle?.trim() || card.name;
  return `"${card.name}": ${fallback}, vector street-art.`;
}

/** Tronque proprement si le prompt dépasse la limite Leonardo. */
export function clampLeonardoPrompt(
  prompt: string,
  max = LEONARDO_MAX_PROMPT_LENGTH,
): string {
  const trimmed = prompt.trim();
  if (trimmed.length <= max) return trimmed;

  const cut = trimmed.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const safe =
    lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut.slice(0, max - 1);
  return `${safe.trimEnd()}.`;
}

/** Prompt Street Art compact (joueurs : ressemblance stylisée, sans nom sur l'image). */
export function buildCardImagePrompt(card: CardImagePromptInput): string {
  const cat = normalizeCategory(card.category);
  const isJoueur = cat === "joueur";
  const rarityLabel = RARITY_LABEL[card.rarity];

  const parts = [
    STYLE,
    isJoueur ? JOUEUR_STYLE : GENERIC_HUMAN,
    buildSubject(card, cat),
    `${colorHint(card.country_code)}, ${rarityLabel} rarity.`,
    AVOID,
    isJoueur ? JOUEUR_AVOID : null,
  ].filter(Boolean);

  return clampLeonardoPrompt(parts.join(" "));
}
