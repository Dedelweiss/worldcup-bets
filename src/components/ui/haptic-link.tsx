"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { bindHapticClick, type HapticStyle } from "@/lib/haptics";

type HapticLinkProps = ComponentProps<typeof Link> & {
  haptic?: HapticStyle;
};

export function HapticLink({
  onClick,
  haptic = "light",
  ...props
}: HapticLinkProps) {
  return (
    <Link {...props} onClick={bindHapticClick(onClick, haptic)} />
  );
}
