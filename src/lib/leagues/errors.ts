/** Messages d'erreur ligues (RPC Supabase) en français lisible */
export function formatLeagueError(message: string): string {
  if (message.includes("Could not find the function")) {
    return "Fonction ligues absente. Exécutez les migrations 014 et 016 dans Supabase.";
  }
  if (
    message.includes("déjà dans une ligue") ||
    message.includes("SINGLE_LEAGUE")
  ) {
    return "Vous êtes déjà dans une ligue. Seul un administrateur peut vous ajouter à une autre.";
  }
  if (message.includes("invalide") || message.includes("Invalid invite")) {
    return "Code d'invitation invalide.";
  }
  return message;
}
