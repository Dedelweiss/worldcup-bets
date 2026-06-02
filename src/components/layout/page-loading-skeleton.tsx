"use client";

import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-white/10",
        className,
      )}
      aria-hidden
    />
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Chargement">
      <div className="space-y-2">
        <Bone className="h-8 w-48" />
        <Bone className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Bone className="h-36 sm:col-span-2 lg:col-span-1" />
        <Bone className="h-36" />
        <Bone className="h-36" />
      </div>
      <div className="space-y-3">
        <Bone className="h-5 w-32" />
        <Bone className="h-24 w-full" />
        <Bone className="h-24 w-full" />
        <Bone className="h-24 w-full" />
      </div>
    </div>
  );
}
