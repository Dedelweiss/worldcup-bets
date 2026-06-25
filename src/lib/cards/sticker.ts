/** Petite rotation déterministe (toujours la même pour une carte) : effet "collé à la main". */
export function stickerRotation(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return (((h % 9) + 9) % 9) - 4; // -4..+4 degrés
}

/** Fond papier (texture SVG inline = 0 requête réseau) + pliure centrale en dégradé. */
export const PAPER_PANEL_STYLE: React.CSSProperties = {
  backgroundColor: "#efe9dc",
  backgroundImage:
    "linear-gradient(90deg, transparent 49.2%, rgba(0,0,0,0.06) 49.8%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.06) 50.2%, transparent 50.8%), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
};
