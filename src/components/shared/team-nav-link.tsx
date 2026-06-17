"use client";

import type { ComponentProps, ReactNode } from "react";
import { NavLink } from "@/components/layout/nav-link";
import { isTbdTeam, type TeamLike } from "@/lib/tournament/tbd-team";
import { cn } from "@/lib/utils";

type TeamNavLinkProps = {
  team: TeamLike & { id?: number };
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof NavLink>, "href" | "children" | "className">;

/** Lien vers la fiche équipe, absent pour les placeholders TBD. */
export function TeamNavLink({
  team,
  children,
  className,
  ...rest
}: TeamNavLinkProps) {
  if (team.id == null || isTbdTeam(team)) {
    return <span className={className}>{children}</span>;
  }

  return (
    <NavLink
      href={`/teams/${team.id}`}
      className={cn("transition-colors hover:text-primary", className)}
      {...rest}
    >
      {children}
    </NavLink>
  );
}
