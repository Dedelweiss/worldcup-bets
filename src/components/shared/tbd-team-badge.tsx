import { cn } from "@/lib/utils";

interface TbdTeamBadgeProps {
  size?: number;
  className?: string;
}

/** Badge « équipe à déterminer » — phase finale / arbre. */
export function TbdTeamBadge({ size = 32, className }: TbdTeamBadgeProps) {
  const id = `tbd-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="4" y1="4" x2="28" y2="28">
          <stop offset="0%" stopColor="#a3e635" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#27272a" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#a3e635" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#71717a" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <circle
        cx="16"
        cy="16"
        r="14.5"
        fill={`url(#${id}-fill)`}
        stroke={`url(#${id}-ring)`}
        strokeWidth="1.25"
        strokeDasharray="4 3"
      />
      <circle
        cx="16"
        cy="16"
        r="7.5"
        fill="none"
        stroke="#a3e635"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <path
        d="M16 9.5a3.25 3.25 0 0 0-2.2 5.65c.75.65 1.2 1.45 1.2 2.35v.5"
        fill="none"
        stroke="#d4d4d8"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="21.25" r="1.1" fill="#a3e635" />
    </svg>
  );
}
