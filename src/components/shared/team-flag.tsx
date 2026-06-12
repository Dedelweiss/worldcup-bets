import Image from "next/image";
import { TbdTeamBadge } from "@/components/shared/tbd-team-badge";
import { teamLogoUrl } from "@/lib/flags";
import { isTbdTeam } from "@/lib/tournament/tbd-team";
import { cn } from "@/lib/utils";

interface TeamFlagProps {
  name: string;
  code: string | null;
  logoUrl?: string | null;
  size?: number;
  className?: string;
  teamId?: number;
  /** Remplit le conteneur parent (size-full) — utile pour les emblèmes responsives. */
  fill?: boolean;
  /** Largeur flagcdn si pas de logo_url (évite le flou au-delà de 80px). */
  flagWidth?: number;
  /** Rasterise le drapeau en PNG pour l’export DOM (carte FUT). */
  exportInline?: boolean;
}

export function TeamFlag({
  name,
  code,
  logoUrl,
  size = 32,
  className,
  teamId,
  fill = false,
  flagWidth,
  exportInline = false,
}: TeamFlagProps) {
  if (isTbdTeam({ id: teamId, name, code, logo_url: logoUrl })) {
    return (
      <span
        role="img"
        aria-label={name}
        className={cn(
          "inline-flex shrink-0 items-center justify-center",
          fill && "size-full",
          className,
        )}
      >
        <TbdTeamBadge size={fill ? 32 : size} className={fill ? "size-full" : undefined} />
      </span>
    );
  }

  const src = teamLogoUrl(
    { logo_url: logoUrl ?? null, code },
    flagWidth ?? Math.max(80, Math.ceil(size * 2)),
  );

  if (src) {
    if (fill) {
      return (
        <span
          className={cn("relative block size-full shrink-0 overflow-hidden rounded-full bg-muted", className)}
        >
          <Image
            src={src}
            alt={name}
            fill
            sizes="128px"
            className="object-cover"
            unoptimized
            {...(exportInline ? { "data-export-avatar": "" } : {})}
          />
        </span>
      );
    }

    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full bg-muted object-cover", className)}
        style={{ width: size, height: size }}
        unoptimized
        {...(exportInline ? { "data-export-avatar": "" } : {})}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-muted font-bold",
        fill && "size-full",
        className,
      )}
      style={fill ? { fontSize: "1.75rem" } : { width: size, height: size, fontSize: size * 0.35 }}
    >
      {code ?? name.slice(0, 2).toUpperCase()}
    </span>
  );
}
