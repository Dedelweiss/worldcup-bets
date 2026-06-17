import { Crosshair, Shield, User, Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SquadPositionGroup } from "@/lib/tournament/squad-display";

interface SquadPositionIconProps {
  group: SquadPositionGroup;
  className?: string;
}

/** Gant de gardien (football-data.org ne fournit pas de photos joueurs). */
function GoalkeeperGloveIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M7 10V6a2 2 0 0 1 2-2h1.5a1.5 1.5 0 0 1 1.5 1.5V10" />
      <path d="M7 10c-1.5 1.2-2 3.2-1.5 5.2.6 2.4 2.8 4.3 5.5 4.8 3.2.6 6.3-.8 7.5-3.5 1-2.2.2-4.5-1.2-6.2-.8-1-1.8-1.8-3-2.3" />
      <path d="M10 8.5V5.5" />
      <path d="M12 9V6" />
      <path d="M14 10V7" />
    </svg>
  );
}

export function SquadPositionIcon({ group, className }: SquadPositionIconProps) {
  const iconClass = cn("size-4 shrink-0", className);

  switch (group) {
    case "gk":
      return <GoalkeeperGloveIcon className={iconClass} />;
    case "def":
      return <Shield className={iconClass} strokeWidth={2} aria-hidden />;
    case "mid":
      return <Waypoints className={iconClass} strokeWidth={2} aria-hidden />;
    case "fwd":
      return <Crosshair className={iconClass} strokeWidth={2} aria-hidden />;
    default:
      return <User className={iconClass} strokeWidth={2} aria-hidden />;
  }
}
