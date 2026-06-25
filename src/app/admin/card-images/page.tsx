import Link from "next/link";
import { CardImagesAdminPanel } from "@/components/admin/card-images-admin-panel";
import {
  getCardImageAdminStats,
  listCardImagesForAdmin,
} from "@/lib/cards/card-image-jobs";
import { requireAdmin } from "@/lib/auth-server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Images cartes" };

export default async function AdminCardImagesPage() {
  await requireAdmin();

  const [stats, list] = await Promise.all([
    getCardImageAdminStats(),
    listCardImagesForAdmin({ filter: "missing", page: 1, pageSize: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Images cartes (IA)</h1>
          <p className="text-sm text-muted-foreground">
            Génération Leonardo, preview et publication WebP sur le CDN. Les
            prompts utilisent les couleurs nation via{" "}
            <code className="text-xs">getTeamColors()</code>.
          </p>
        </div>
        <Link
          href="/admin/collection"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Collection
        </Link>
      </div>

      <CardImagesAdminPanel initialStats={stats} initialList={list} />
    </div>
  );
}
