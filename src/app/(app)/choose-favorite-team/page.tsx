import { redirect } from "next/navigation";

export const metadata = { title: "Équipe favorite" };

/** @deprecated Redirige vers le parcours onboarding unifié. */
export default function ChooseFavoriteTeamPage() {
  redirect("/onboarding");
}
