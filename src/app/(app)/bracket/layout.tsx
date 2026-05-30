/** Sort du conteneur max-w-5xl pour afficher l'arbre en largeur */
export default function BracketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative left-1/2 w-screen max-w-none -translate-x-1/2 px-4">
      <div className="mx-auto w-full max-w-[96rem]">{children}</div>
    </div>
  );
}
