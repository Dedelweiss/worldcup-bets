import { normalizeCategory, type CardCategory } from "@/lib/cards/card-categories";
import { iso2ToName } from "@/lib/cards/nations";
import { RARITY_LABEL } from "@/lib/cards/styles";
import { getTeamColors } from "@/lib/team-colors";
import type { CardRarity } from "@/lib/cards/types";

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

const STREET_ART_STYLE = [
  "Artistic style: Street Art and modern Vector Illustration.",
  "Vibrant flat color blocks, bold pronounced outlines, graffiti-inspired graphic poster aesthetic.",
  "Full-bleed artwork filling the entire trading card frame edge to edge, no empty margins, no inner inset panel.",
  "Vertical collectible trading card artwork, 3:4 portrait composition.",
  "Stylized graphic design only — never photorealistic, never a photographic portrait.",
  "Humans appear as comic-book stylized characters: faces simplified into abstract color planes with dynamic expression, no recognizable real-person likeness.",
].join(" ");

const NEGATIVE_CONSTRAINTS = [
  "Do NOT include: FIFA logo, World Cup year badge, CDM 2018 or any tournament date text, corner tournament branding, federation crest, club badge, sponsor logos, watermarks, readable text labels, newspaper headlines, TV scoreboard text.",
].join(" ");

function colorHint(countryCode: string | null): string {
  const palette = getTeamColors(countryCode);
  return `Color palette inspired by ${palette.from} and ${palette.to}, flat vibrant tones`;
}

function buildObjetSubject(
  code: string | null | undefined,
  name: string,
  icon?: string | null,
): string {
  const key = (code ?? name).toLowerCase();

  if (key.includes("var") || name.toLowerCase() === "var") {
    return [
      `Card title: "${name}". Subject is Video Assistant Referee (VAR) technology — NOT a football player.`,
      "Composition: dark review booth with multiple flat-screen monitors showing stylized pitch replay graphics (green field, white vector lines, abstract offside triangles).",
      "Optional referee silhouette from behind or side, hand gesture toward screens. Focus on screens and technology.",
      "Absolutely NO player face, NO portrait close-up, NO athlete headshot.",
    ].join(" ");
  }

  if (key.includes("whistle") || name.toLowerCase().includes("sifflet")) {
    return `Card title: "${name}". Subject: referee whistle and match official gear as bold vector icon composition, dynamic motion lines, no human portrait.`;
  }

  if (key.includes("ball") || name.toLowerCase().includes("ballon")) {
    return `Card title: "${name}". Subject: stylized football with motion streaks and geometric patterns, hero object shot, no players.`;
  }

  if (icon === "ball") {
    return `Card title: "${name}". Subject: stylized football icon, vector graphic centerpiece, no human figures.`;
  }

  return `Card title: "${name}". Subject: football-themed object "${name}" as the sole visual focus, symbolic vector illustration, no player portrait unless the object itself requires it.`;
}

function buildStadeSubject(card: CardImagePromptInput): string {
  const subtitle = card.stats?.subtitle?.trim();
  const place = subtitle ? ` (${subtitle})` : "";
  return [
    `Card title: "${card.name}". Subject: stadium architecture${place}.`,
    "Hero exterior or aerial view, geometric vector shapes, crowd suggested as flat color blocks in stands.",
    "No player portraits, no tournament badges.",
  ].join(" ");
}

function buildLegendeSubject(card: CardImagePromptInput): string {
  const decade = card.stats?.decade ?? card.stats?.subtitle ?? "classic era";
  return [
    `Card title: "${card.name}". Subject: stylized dream team of eleven generic football players in ${decade} retro aesthetic.`,
    "Formation diagram feel, small uniform silhouettes, no individual celebrity likeness, no faces in detail.",
  ].join(" ");
}

function buildSpecialSubject(card: CardImagePromptInput): string {
  const name = card.name.toLowerCase();
  if (name.includes("12") || card.stats?.icon === "crowd") {
    return [
      `Card title: "${card.name}". Subject: passionate stadium crowd and supporters in the stands.`,
      "Abstract silhouettes, raised arms, flags as flat color shapes, collective energy — no single player portrait.",
    ].join(" ");
  }
  return `Card title: "${card.name}". Subject: "${card.name}" as symbolic football World Cup scene, vector street-art composition.`;
}

function buildTropheeSubject(card: CardImagePromptInput): string {
  return [
    `Card title: "${card.name}". Subject: golden championship trophy as stylized vector icon.`,
    "Generic cup silhouette with light rays, not an exact FIFA trophy replica, no text engraving.",
  ].join(" ");
}

function buildNationSubject(card: CardImagePromptInput, nation: string | null): string {
  return [
    `Card title: "${card.name}". Subject: national team identity for ${nation ?? card.name}.`,
    "Abstract flag-inspired geometric shapes, bold patriotic color blocks, no photorealistic faces, no official federation logo.",
  ].join(" ");
}

function buildJoueurSubject(
  card: CardImagePromptInput,
  nation: string | null,
): string {
  const role = card.position?.trim() || "football player";
  return [
    `Card title: "${card.name}". Subject: stylized generic ${role} character for ${nation ?? "international"} team.`,
    "Dynamic action pose, jersey suggested by flat color blocks matching team palette.",
    "Face as abstract color-block comic style — energetic expression, zero resemblance to any real athlete named on the card.",
  ].join(" ");
}

function buildSubject(card: CardImagePromptInput, cat: CardCategory | "autre"): string {
  const icon = card.stats?.icon;

  if (cat === "objet") {
    return buildObjetSubject(card.code, card.name, icon);
  }
  if (cat === "stade") {
    return buildStadeSubject(card);
  }
  if (cat === "legende") {
    return buildLegendeSubject(card);
  }
  if (cat === "special") {
    return buildSpecialSubject(card);
  }
  if (cat === "trophee") {
    return buildTropheeSubject(card);
  }

  const nation = card.country_code
    ? (iso2ToName(card.country_code) ?? card.country_code.toUpperCase())
    : null;

  if (cat === "nation") {
    return buildNationSubject(card, nation);
  }
  if (cat === "joueur") {
    return buildJoueurSubject(card, nation);
  }

  const fallback = card.stats?.subtitle?.trim() || card.name;
  return `Card title: "${card.name}". Subject: "${fallback}" — interpret literally from the card name, vector street-art illustration.`;
}

/** Prompt Street Art / vectoriel centré sur le nom de la carte (sans portrait réaliste). */
export function buildCardImagePrompt(card: CardImagePromptInput): string {
  const cat = normalizeCategory(card.category);
  const rarityLabel = RARITY_LABEL[card.rarity];
  const colors = colorHint(card.country_code);
  const subject = buildSubject(card, cat);

  return [
    STREET_ART_STYLE,
    subject,
    colors + ".",
    `${rarityLabel} rarity collectible card mood, high contrast, print-ready vector artwork.`,
    NEGATIVE_CONSTRAINTS,
  ].join(" ");
}
