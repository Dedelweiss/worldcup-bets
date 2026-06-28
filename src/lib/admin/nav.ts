import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  FileText,
  Flag,
  ImageIcon,
  Layers,
  LayoutGrid,
  PlusCircle,
  ScrollText,
  Trophy,
  Users,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    title: "Matchs & paris",
    items: [
      {
        href: "/admin",
        label: "Matchs",
        icon: LayoutGrid,
        description: "Scores, statuts, marchés fun",
      },
      {
        href: "/admin/pronos",
        label: "Pronos",
        icon: ClipboardList,
        description: "Explorer les paris par joueur",
      },
      {
        href: "/admin/matches/new",
        label: "Créateur",
        icon: PlusCircle,
        description: "Ajouter un match au calendrier",
      },
    ],
  },
  {
    title: "Joueurs & ligues",
    items: [
      {
        href: "/admin/users",
        label: "Joueurs",
        icon: Users,
        description: "Soldes, boosts, tacles, comptes",
      },
      {
        href: "/admin/leagues",
        label: "Ligues",
        icon: Trophy,
        description: "Ligues privées et membres",
      },
      {
        href: "/admin/campaigns",
        label: "Formulaires",
        icon: FileText,
        description: "Campagnes de pronos tournoi",
      },
      {
        href: "/admin/collection",
        label: "Collection",
        icon: Layers,
        description: "Cartes, jetons packs et albums",
      },
      {
        href: "/admin/card-images",
        label: "Images cartes",
        icon: ImageIcon,
        description: "Génération IA Leonardo et publication WebP",
      },
    ],
  },
  {
    title: "Compétition",
    items: [
      {
        href: "/admin/teams",
        label: "Équipes",
        icon: Flag,
        description: "Effectifs et vainqueur Coupe du monde",
      },
      {
        href: "/admin/f1",
        label: "Formule 1",
        icon: Trophy,
        description: "Sync OpenF1, résultats GP, mode F1",
      },
    ],
  },
  {
    title: "Système",
    items: [
      {
        href: "/admin/logs",
        label: "Journal",
        icon: ScrollText,
        description: "Logs applicatifs et sync",
      },
    ],
  },
];

export const adminMobilePrimaryTabs: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Matchs",
    icon: LayoutGrid,
  },
  {
    href: "/admin/pronos",
    label: "Pronos",
    icon: ClipboardList,
  },
  {
    href: "/admin/users",
    label: "Joueurs",
    icon: Users,
  },
];

export function flattenAdminNavItems(): AdminNavItem[] {
  return adminNavGroups.flatMap((group) => group.items);
}

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Routes accessibles uniquement via le menu « Plus » sur mobile. */
export function isAdminDrawerRoute(pathname: string): boolean {
  const primaryHrefs = new Set(adminMobilePrimaryTabs.map((tab) => tab.href));
  return flattenAdminNavItems().some(
    (item) =>
      !primaryHrefs.has(item.href) && isAdminNavActive(pathname, item.href),
  );
}
