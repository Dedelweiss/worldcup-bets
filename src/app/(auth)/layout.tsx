import Link from "next/link";
import { SiteLogo } from "@/components/layout/site-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-background px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight"
      >
        <SiteLogo size={36} className="size-9" priority />
        WC<span className="text-primary">2026</span> Pool
      </Link>
      {children}
    </div>
  );
}
