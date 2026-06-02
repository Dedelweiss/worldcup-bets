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
}

export function TeamFlag({
  name,
  code,
  logoUrl,
  size = 32,
  className,
  teamId,
}: TeamFlagProps) {
  if (isTbdTeam({ id: teamId, name, code, logo_url: logoUrl })) {
    return (
      <span
        role="img"
        aria-label={name}
        className={cn("inline-flex shrink-0", className)}
      >
        <TbdTeamBadge size={size} />
      </span>
    );
  }

  const src = teamLogoUrl({ logo_url: logoUrl ?? null, code });

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full bg-muted object-cover", className)}
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-muted font-bold",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {code ?? name.slice(0, 2).toUpperCase()}
    </span>
  );
}
