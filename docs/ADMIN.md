# Mode administrateur — gestion manuelle

L’application ne dépend plus d’une API sportive externe. Les matchs, cotes et scores sont gérés via **`/admin`**.

## 1. Migration SQL

Dans Supabase **SQL Editor**, exécuter **un fichier à la fois** (Run entre chaque) :

1. `001_initial_schema.sql` (si pas déjà fait)
2. `002_admin_roles_manual.sql`
3. `003_place_bet_validation.sql`
4. **`004a_add_bet_type_fun.sql`** ← seul, obligatoire avant 004
5. `004_fun_bets_stats_admin.sql`
6. `005_fix_admin_adjust_balance.sql` (si besoin)
7. `006_fix_get_leaderboard_stats.sql` (si besoin)
8. `007_admin_reset_app.sql` (bouton réinitialisation tests)
9. `008_admin_delete_user.sql` (suppression de comptes joueurs)
10. `009_sync_live_matches.sql` (passage automatique **scheduled → live** à l’heure de coup d’envoi)
11. `010_fix_admin_create_match.sql` (si erreur `column "p_away" does not exist` à la création de match)
12. `011_tournament_groups_stages.sql` (groupes A–L, phases, arbre, créateur de match)
13. `012_private_leagues_leaderboard.sql` (ligues privées + classement filtré)
14. `013_fix_leagues_rls_admin_read.sql` (si 404 après création d’une ligue)

### Workflow admin CDM 2026

1. **`/admin/teams`** — enregistrer les 4 équipes de chaque groupe (nom + code ISO pour flagcdn, ex. `FR`).
2. **`/admin/matches/new`** — onglet **Poules** : groupe → 2 équipes → date/cotes → « Ajouter au calendrier ».
3. **Phase finale** — même page, onglet **Phase finale** : tour (16es, quarts…), équipes libres, emplacement dans l’arbre, note paris temps réglementaire.
4. Joueurs : **`/matches`** (filtres groupes / finale) et **`/bracket`** (arbre qui se remplit).

### Ligues privées

1. **`/admin/leagues`** — créer une ligue (ex. « La Famille »).
2. **Gérer** — cocher les joueurs membres → Enregistrer.
3. **`/leaderboard`** — périmètre « Mes ligues » + menu déroulant + thème (Bankroll / Paris matchs / Paris fun).

Code invitation : affiché sur la fiche ligue (RPC `join_league_by_invite_code` prête pour une future UI joueur).

> Erreur `unsafe use of new value "fun"` → vous avez sauté l’étape **004a** ou tout collé en une seule requête.

Les matchs passent en **live** dès que `kickoff_at` est atteint (comparaison UTC côté base, affichage en **Europe/Paris** dans l’app). Le dashboard se rafraîchit toutes les 30 s pour refléter le changement sans recharger la page manuellement.

## 2. Promouvoir ton compte admin

Après inscription, récupère ton UUID :

**Authentication → Users** ou :

```sql
select id, email from auth.users;
```

Puis :

```sql
update public.profiles
set role = 'admin'
where id = 'TON-UUID-ICI';
```

## 3. Accès

- URL : [http://localhost:3000/admin](http://localhost:3000/admin)
- Lien **Admin** dans le header (visible uniquement si `role = 'admin'`)
- Les utilisateurs normaux sont redirigés vers `/dashboard`

## 4. Workflow admin

1. **Nouveau match** — équipes, date/heure, cotes 1N2
2. **Paris fun** — question + cotes Oui/Non sur la page admin du match
3. Les joueurs parient sur `/matches/[id]` (1N2 fermé au coup d'envoi, fun ouverts jusqu'à clôture admin)
4. Pendant / après le match — score final + **Clôturer le match** (1N2)
5. **Oui/Non gagnant** sur chaque pari fun pour payer les gagnants
6. **Soldes** — `/admin/users` pour bonus/malus manuels
7. **Réinitialisation tests** — `/admin/users` → zone rouge « Réinitialiser » (tapez `RESET`)
8. **Supprimer un joueur** — icône poubelle sur `/admin/users` (+ `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`)

## 5. Sécurité

| Couche | Protection |
|--------|------------|
| Middleware Next.js | `/admin/*` → vérifie `profiles.role = 'admin'` |
| Layout `requireAdmin()` | Double contrôle côté serveur |
| Supabase RLS + RPC | `is_admin()` sur insert/update matchs et `settle_match` |

## 6. Format des paris 1N2 (pour la clôture)

Les paris doivent avoir `bet_type = 'match_result'` et :

```json
{ "selection": "home" }
{ "selection": "draw" }
{ "selection": "away" }
```

La fonction `settle_match` compare au score final enregistré sur le match.

## 7. Erreur « Could not find the function admin_adjust_balance »

La migration **004** n’a pas été exécutée ou l’API n’a pas rechargé le schéma.

1. Supabase → **SQL Editor** → coller tout `005_fix_admin_adjust_balance.sql` → **Run**
2. Attendre ~10 s ou **Project Settings → API → Reload schema**
3. Réessayer sur `/admin/users` (montant négatif pour retirer, ex. `-20`)

## 8. Erreur `unsafe use of new value "fun" of enum type bet_type`

PostgreSQL n’autorise pas d’utiliser `'fun'` dans la même transaction que son `ALTER TYPE`.

1. Exécuter **uniquement** `004a_add_bet_type_fun.sql` → Run → succès
2. Puis `004_fun_bets_stats_admin.sql` ou `006_fix_get_leaderboard_stats.sql`

## 9. Erreur « Could not find the function get_leaderboard_stats »

1. SQL Editor → exécuter `006_fix_get_leaderboard_stats.sql`
2. Recharger le schéma API si besoin
3. Rafraîchir `/leaderboard`
