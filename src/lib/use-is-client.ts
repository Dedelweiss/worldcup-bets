import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * `false` on the server and on the client's first hydration pass (matches SSR).
 * `true` after hydration — safe to mount Framer Motion / layout-dependent UI.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
