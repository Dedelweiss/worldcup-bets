import { normalizeCategory, type CardCategory } from "@/lib/cards/card-categories";
import { iso2ToName } from "@/lib/cards/nations";
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

const AVOID =
  "No FIFA logos, federation crests, sponsors, watermarks, captions, or any readable text anywhere.";

/** Negative prompt joueurs — texte interdit sur l'illustration, ressemblance faciale OK. */
export const LEONARDO_NEGATIVE_PROMPT =
  "text, letters, words, names printed on card, logos, brand marks, official emblems, watermark, signature, blurry face, distorted hands, low quality, unreadable jersey numbers, real-world team crests, player name banner, typography, caption, title bar, autograph";

const JOUEUR_CARD_STYLE =
  "Vintage collectible trading card portrait, dynamic three-quarter mid-action pose, centered portrait orientation 3:4, retro-modern premium sports card aesthetic.";

function colorHint(countryCode: string | null): string {
  const nation = countryCode ? iso2ToName(countryCode) : null;
  return nation ? `${nation} team colors` : "Vibrant national palette";
}

function rarityFinish(rarity: CardRarity): string {
  switch (rarity) {
    case "legendaire":
      return "Legendary glossy holographic foil border, gold and silver metallic gradients, ultra-premium finish";
    case "epique":
      return "Epic holographic foil border, abstract geometric accents, metallic silver and gold gradients";
    case "rare":
      return "Rare glossy foil border, subtle metallic accents";
    default:
      return "Classic vintage card finish, vibrant saturated colors";
  }
}

function shortRole(position: string | null): string {
  const p = position?.trim();
  if (!p) return "soccer player";
  if (p.length <= 28) return p.toLowerCase();
  return p.slice(0, 25).trimEnd() + "…";
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

/**
 * Portrait joueur : le nom guide la ressemblance faciale dans le modèle,
 * mais le prompt interdit explicitement tout texte / nom imprimé sur la carte.
 */
function buildJoueurSubject(
  card: CardImagePromptInput,
  nation: string | null,
): string {
  const role = shortRole(card.position);
  const team = nation ?? "international";
  const colors = colorHint(card.country_code);

  return [
    `Male ${role} with bold recognizable facial features resembling ${card.name}.`,
    `${colors} jersey tones, plain kit with no official logos, badges, or sponsor marks.`,
    "Energetic stadium background, soft bokeh lights, sweeping motion-blur crowd.",
    `${rarityFinish(card.rarity)}.`,
    "Cinematic dramatic lighting, sharp facial detail, confident expression, sweat highlights, detailed fabric texture.",
    "Photorealistic portrait with a stylized illustrative edge, depth of field, high resolution.",
    "Important: NO text, NO printed player name, NO league or tournament emblems anywhere on the artwork.",
  ].join(" ");
}

function buildJoueurPrompt(card: CardImagePromptInput): string {
  const nation = card.country_code
    ? (iso2ToName(card.country_code) ?? card.country_code.toUpperCase())
    : null;
  const rarityLabel = RARITY_LABEL[card.rarity];

  return clampLeonardoPrompt(
    [
      JOUEUR_CARD_STYLE,
      buildJoueurSubject(card, nation),
      `${rarityLabel} rarity collectible card mood.`,
    ].join(" "),
  );
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

/** Prompt Leonardo : joueurs = portrait carte vintage ressemblant au nom ; autres = street-art compact. */
export function buildCardImagePrompt(card: CardImagePromptInput): string {
  const cat = normalizeCategory(card.category);
  if (cat === "joueur") {
    return buildJoueurPrompt(card);
  }

  const rarityLabel = RARITY_LABEL[card.rarity];
  const parts = [
    STYLE,
    GENERIC_HUMAN,
    buildSubject(card, cat),
    `${colorHint(card.country_code)}, ${rarityLabel} rarity.`,
    AVOID,
  ];

  return clampLeonardoPrompt(parts.join(" "));
}
