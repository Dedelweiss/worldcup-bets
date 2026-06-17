"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/** Navigation structurelle : pas de prefetch RSC (évite le burst au chargement). */
export function NavLink(props: ComponentProps<typeof Link>) {
  return <Link prefetch={false} {...props} />;
}
