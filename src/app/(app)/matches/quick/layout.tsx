/** Plein écran sur mobile : le mode rapide gère son propre layout. */
export default function QuickBetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative -mx-4 min-h-[calc(100dvh-3.5rem)] md:mx-0 md:min-h-0">
      {children}
    </div>
  );
}
