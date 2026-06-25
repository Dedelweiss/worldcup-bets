import { RARITY_LABEL } from "@/lib/cards/styles";
import {
  FutCardShareCancelledError,
  shareOrDownloadFutCard,
} from "@/lib/profile/export-fut-card-image";
import {
  albumCardImageFilename,
  renderPackedAlbumCardImage,
} from "@/lib/cards/render-album-card-share-image";
import type { AlbumCard, CardRarity } from "@/lib/cards/types";

export const SITE_PRODUCT_NAME = "WC2026 Pool";

export function buildCardShareText(card: {
  name: string;
  rarity: CardRarity;
}): string {
  const rarityLabel = RARITY_LABEL[card.rarity].toLowerCase();
  return `Regarde la carte ${rarityLabel} ${card.name} que je viens de packer sur ${SITE_PRODUCT_NAME} !`;
}

export class CardShareCancelledError extends Error {
  constructor() {
    super("Share cancelled");
    this.name = "CardShareCancelledError";
  }
}

/** Image autocollant packé (cadre, rareté, n°) — prête pour Stories / WhatsApp. */
export async function shareAlbumCard(
  card: AlbumCard,
): Promise<"shared" | "downloaded"> {
  const blob = await renderPackedAlbumCardImage(card);
  const filename = albumCardImageFilename(card);

  try {
    return await shareOrDownloadFutCard(blob, filename);
  } catch (error) {
    if (error instanceof FutCardShareCancelledError) {
      throw new CardShareCancelledError();
    }
    throw error;
  }
}
