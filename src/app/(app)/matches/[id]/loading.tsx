import { PageLoadingSkeleton } from "@/components/layout/page-loading-skeleton";

export default function MatchLoading() {
  return (
    <div className="mx-auto max-w-lg">
      <PageLoadingSkeleton />
    </div>
  );
}
