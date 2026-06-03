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
15. `014_leagues_invite_and_my_leagues.sql` (mes ligues au classement + invitation par code)
16. `015_leaderboard_league_labels.sql` (badges ligue au classement)
17. `016_single_league_self_service.sql` (une seule ligue / joueur sauf ajout admin)
18. `017_fun_markets_realtime.sql` (notifications temps réel des nouveaux paris fun)
19. `018_points_system_live_bets.sql` (points selon cotes, sans mise · paris visibles en direct)
20. `019_player_username.sql` (pseudos joueurs uniques)
21. `020_badges_achievements.sql` (trophées / succès + affichage classement)
22. `021_badges_points_era.sql` (remplace Le Flambeur par succès basés sur points & cotes)
23. `022_boost_x2_joker.sql` (joker Boost x2 unique sur paris classiques 1N2)
24. `023_match_chat_reveal_bets.sql` (chat temps réel par match + paris publics après coup d'envoi)
25. `024_match_delete_cascade.sql` (suppression match → cascade paris, fun, chat, transactions)
26. `025_exact_score_precision.sql` (score exact : Tendance / Tout pile)
27. `026_exact_score_odds_based_points.sql` (score exact indexé sur la cote du vainqueur implicite)
28. `027_golden_match.sql` (Golden Match : un match « en or », gains ×2 à la clôture)
29. `028_match_betting_participation.sql` (liste qui a parié sur un match sans révéler les pronos)
30. `029_fun_bets_fun_market_id.sql` (corrige FK paris fun : colonne `fun_market_id`)
31. `030_classic_bet_mutual_exclusivity.sql` (un seul pronostic classique par match : 1N2 ou score exact)
32. `031_on_fire_heat.sql` (série On Fire : 3 victoires classiques d'affilée, +1 pt bonus, flamme au classement)
33. `032_fix_admin_reset_app.sql` (reset admin : corrige l'appel `(delete_matches, points)` — plus de colonne `balance`)
34. `033_admin_live_score_and_heat_recompute.sql` (scores admin → match en direct ; On Fire recalculé à la clôture)
35. `034_fun_bet_one_per_market.sql` (un pari fun par joueur et par marché, non modifiable)
36. `035_favorite_team.sql` (équipe favorite : choix unique, bonus si champion du monde)
37. `036_admin_profile_edit.sql` (admin : modifier pseudo et équipe favorite de tout joueur)
38. `037_fix_admin_reset_where.sql` (reset admin : `UPDATE profiles` avec `WHERE id IS NOT NULL`)
39. `038_admin_reset_clear_badges.sql` (reset admin : efface aussi `user_badges`)
40. `039_update_classic_bet_before_kickoff.sql` (modifier son pronostic classique avant le coup d'envoi)
41. `040_admin_match_correction.sql` (correction résultat / re-clôture admin)
42. `041_fix_scheduled_status_sync.sql` (`suppress_auto_live`, sync live verrouillé)
43. `042_admin_clear_match_scores.sql` (effacer scores admin)
44. `043_cancel_pending_bet.sql` (annulation pari en attente par le joueur)
45. `044_tackles_and_ai_summary.sql` (Tacle Glissé PvP + Gazette du Match IA)
46. `045_tackle_cancel_update.sql` (annuler / retargeter un tacle avant coup d'envoi)
47. `046_security_hardening.sql` (RLS durci : profils, paris, tacles, sync live)
48. `047_ai_player_bets.sql` (**joueur IA** : pari score exact au coup d'envoi, compte au classement)
49. `048_gazette_regenerate.sql` (Gazette régénérable par l'admin ; effacée si match repasse en à venir)

Après **047**, le pronostiqueur **L'IA** (`ia_prono`) parie automatiquement un score exact quand le match passe en direct (via `sync_live_matches` + `SUPABASE_SERVICE_ROLE_KEY`). Clé LLM optionnelle (`GROQ_API_KEY` / `GEMINI_API_KEY`) ; sinon heuristique basée sur les cotes.

Après **033**, pour recalculer les flammes sur des matchs déjà clôturés :

```sql
select public.recompute_classic_heat(id) from public.profiles;
```

### Workflow admin CDM 2026

1. **Poules (option rapide)** — exécuter `supabase/scripts/seed_wc2026_groups.sql` dans le SQL Editor pour importer les **48 équipes** (groupes A–L, tirage FIFA 2026). Sinon : **`/admin/teams`** manuellement (nom + code ISO flagcdn, ex. `FR`).
2. **Calendrier poules** — exécuter `supabase/scripts/seed_wc2026_group_matches.sql` pour créer/mettre à jour les **72 matchs** (11–27 juin 2026, horaires UTC). Ré-exécutable ; décommenter le bloc « RESET POULES » si vous les avez supprimés.
3. **Phase finale** — exécuter `supabase/scripts/seed_wc2026_knockout_matches.sql` pour les **32 matchs** M73–M104 (28 juin – 19 juillet). Équipes « À déterminer » jusqu’aux qualifiés ; lier l’arbre (`/bracket`). Ré-exécutable ; bloc « RESET phase finale » si suppression.
4. **`/admin/matches/new`** — onglet **Poules** ou **Phase finale** : corriger cotes, date ou équipes.
5. Joueurs : **`/matches`** (filtres groupes / finale) et **`/bracket`** (arbre qui se remplit).

### Ligues privées

1. **`/admin/leagues`** — créer une ligue (ex. « La Famille »).
2. **Gérer** — cocher les joueurs membres → Enregistrer.
3. **`/leaderboard`** — périmètre « Mes ligues » + menu déroulant + thème (Bankroll / Paris matchs / Paris fun).

**Joueurs** : `/leagues` — rejoindre avec un code, créer une ligue, copier le code à partager.  
**Admin** : cochez les membres sur `/admin/leagues/[id]` ; le créateur est ajouté automatiquement à la création. L’admin peut mettre un joueur dans **plusieurs** ligues ; un joueur seul ne peut rejoindre/créer qu’**une** ligue.

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

1. **Nouveau match** — équipes, date/heure, cotes (domicile · nul · extérieur)
2. **Paris fun** — question + cotes Oui/Non sur la page admin du match
3. Les joueurs parient sur `/matches/[id]` (résultat du match fermé au coup d'envoi, fun ouverts jusqu'à clôture admin)
4. Pendant / après le match — score final + **Clôturer le match** (paris sur le résultat)
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

## 6. Format des paris sur le résultat (pour la clôture)

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
