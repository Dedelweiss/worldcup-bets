export interface NavItem {
  href: string;
  label: string;
}

export const appNav: NavItem[] = [
  { href: "/dashboard", label: "Paris" },
  { href: "/matches", label: "Calendrier" },
  { href: "/matches/fun", label: "Paris fun" },
  { href: "/bracket", label: "Tournoi" },
  { href: "/leaderboard", label: "Classement" },
  { href: "/leagues", label: "Ligues" },
  { href: "/bets", label: "Mes paris" },
  { href: "/collection", label: "Collection" },
  { href: "/shop", label: "Boutique" },
];

export const f1Nav: NavItem[] = [
  { href: "/f1", label: "Calendrier" },
  { href: "/f1/standings", label: "Championnat" },
  { href: "/f1/leaderboard", label: "Classement" },
  { href: "/bets", label: "Mes paris" },
];
