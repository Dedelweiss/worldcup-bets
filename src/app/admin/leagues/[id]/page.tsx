import Link from "next/link";
import { notFound } from "next/navigation";
import { LeagueMembersForm } from "@/components/admin/league-members-form";
import { requireAdmin } from "@/lib/auth-server";
import {
  getLeagueByIdForAdmin,
  getLeagueMemberIdsForAdmin,
} from "@/lib/leagues/admin-queries";
import { isValidUuid } from "@/lib/leagues/parse-uuid";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin · Ligue" };

export default async function AdminLeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  if (!isValidUuid(id)) notFound();

  const league = await getLeagueByIdForAdmin(id);
  if (!league) notFound();

  const supabase = await createClient();
  const { data: players } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .order("display_name");

  const memberIds = await getLeagueMemberIdsForAdmin(id);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/leagues"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← Ligues privées
      </Link>

      <LeagueMembersForm
        league={league}
        players={players ?? []}
        initialMemberIds={memberIds}
      />
    </div>
  );
}
