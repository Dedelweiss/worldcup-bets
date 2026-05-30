import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo.png";

interface SiteLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function SiteLogo({ size = 32, className, priority }: SiteLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt="WC2026 Pool"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-lg object-cover", className)}
    />
  );
}
