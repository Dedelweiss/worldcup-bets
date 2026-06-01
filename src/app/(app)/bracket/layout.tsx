/** Conteneur tournoi : pas de full-bleed (évite le scroll horizontal de page). */
export default function BracketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-w-0 w-full max-w-full">{children}</div>;
}
