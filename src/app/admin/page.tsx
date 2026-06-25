import Link from "next/link";
import { Suspense } from "react";
import { AdminMatchesFilters } from "@/components/admin/admin-matches-filters";
import { AdminMatchesList } from "@/components/admin/admin-matches-list";
import { FootballDataSyncButton } from "@/components/admin/football-data-sync-button";
import { GenerateCardsButton } from "@/components/admin/generate-cards-button";
import { SiteInvitePanel } from "@/components/admin/site-invite-panel";
import { DashboardAnnouncementPanel } from "@/components/admin/dashboard-announcement-panel";
import { PrepareWorldCupPanel } from "@/components/admin/prepare-world-cup-panel";
import { getAdminMatches } from "@/lib/admin/matches";
import { getTournamentConfig } from "@/lib/tournament/config";
import {
  buildSiteInviteMessage,
  getSignupUrl,
} from "@/lib/tournament/site-invite-message";
import { parseAdminMatchSort, sortAdminMatches } from "@/lib/admin/match-sort";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Matchs" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; order?: string }>;
}) {
  const params = await searchParams;
  const { field: sortField, order: sortOrder } = parseAdminMatchSort(
    params.sort,
    params.order,
  );
  const [matches, tournamentConfig] = await Promise.all([
    getAdminMatches().then((rows) => sortAdminMatches(rows, sortField, sortOrder)),
    getTournamentConfig(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Gestion des matchs</h1>
        <div className="flex flex-wrap items-center gap-2">
          <FootballDataSyncButton />
          <GenerateCardsButton />
          <Link
            href="/admin/teams"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Équipes
          </Link>
          <Link
            href="/admin/matches/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Créateur de match
          </Link>
        </div>
      </div>

      <SiteInvitePanel
        signupUrl={getSignupUrl()}
        inviteMessage={buildSiteInviteMessage()}
      />

      <DashboardAnnouncementPanel
        enabled={tournamentConfig.dashboardAnnouncementEnabled}
        message={tournamentConfig.dashboardAnnouncementMessage}
      />

      <PrepareWorldCupPanel />

      <Suspense
        fallback={
          <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        }
      >
        <AdminMatchesFilters sortField={sortField} sortOrder={sortOrder} />
      </Suspense>

      <AdminMatchesList
        matches={matches}
        sortField={sortField}
        sortOrder={sortOrder}
      />
    </div>
  );
}
