# Mode administrateur — gestion manuelle

L’application ne dépend plus d’une API sportive externe. Les matchs, cotes et scores sont gérés via **`/admin`**.

## 1. Migration SQL

Dans Supabase **SQL Editor**, exécuter :

1. `supabase/migrations/001_initial_schema.sql` (si pas déjà fait)
2. `supabase/migrations/002_admin_roles_manual.sql`

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
2. Les joueurs parient sur `/matches/[id]` (1N2, mise en €)
3. Pendant / après le match — passer en **En direct** ou saisir le **score final**
4. **Clôturer le match & payer les gagnants** — crédite automatiquement les bankrolls (paris 1N2 `pending`)

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
