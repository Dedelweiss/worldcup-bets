import Link from "next/link";
import { SiteLogo } from "@/components/layout/site-logo";

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b border-white/10 px-4 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <SiteLogo size={28} className="size-7" />
          WC<span className="text-primary">2026</span> Pool
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
