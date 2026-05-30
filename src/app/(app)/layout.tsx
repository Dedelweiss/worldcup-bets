import { AppHeader } from "@/components/layout/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
