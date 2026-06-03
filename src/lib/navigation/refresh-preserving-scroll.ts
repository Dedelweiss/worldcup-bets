/** router.refresh() remet le scroll en haut — on le restaure après le re-render RSC. */
export function refreshPreservingScroll(router: { refresh: () => void }): void {
  if (typeof window === "undefined") {
    router.refresh();
    return;
  }

  const scrollY = window.scrollY;
  router.refresh();

  const restore = () => {
    if (window.scrollY !== scrollY) {
      window.scrollTo(0, scrollY);
    }
  };

  restore();
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
  window.setTimeout(restore, 50);
  window.setTimeout(restore, 150);
}
