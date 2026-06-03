# Configuration Supabase — WC2026 Pool

## 1. Créer le projet

1. [supabase.com](https://supabase.com) → **New project**
2. Récupérer dans **Project Settings → API Keys** :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`  
     Ex. `https://ebvtdftjzulvrxvoaskv.supabase.co`  
     ⚠️ **Ne pas** coller l’URL qui finit par `/rest/v1/` (c’est l’endpoint REST, pas l’URL du projet).
   - **anon public** (publishable) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Copier `.env.example` vers `.env.local` et remplir les valeurs.

## 2. Exécuter le schéma SQL

Dans **SQL Editor** → **New query**, coller et exécuter dans l’ordre :

1. `migrations/001_initial_schema.sql`
2. `seed.sql` (matchs de démo)

## 3. Authentification (pseudo + mot de passe)

L’app utilise **Email** côté Supabase Auth avec un email technique masqué (`pseudo@accounts.wc2026.internal`). Les joueurs ne saisissent que **pseudo + mot de passe**.

1. **Authentication → Providers → Email** : activé
2. Désactiver **Confirm email** (recommandé entre amis)
3. **Google OAuth** : laisser désactivé (pas de collecte email / photo Google)

Exécuter aussi :

- `migrations/061_username_auth_avatars.sql` (avatars prédéfinis + trigger inscription)
- `migrations/062_profile_avatar_storage.sql` (bucket Storage photo de profil, max ~200 Ko)
- `migrations/063_leaderboard_avatar_url.sql` (avatars dans le classement)

## 4. Vérification

```bash
npm run dev
```

- Créer un compte sur `/signup`
- Vérifier dans **Table Editor → profiles** : `balance = 100`
- Vérifier **transactions** : ligne `signup_bonus`
- Dashboard : matchs créés par un admin (voir ci-dessous)

## 6. Mode administrateur (matchs manuels)

1. Exécuter `migrations/002_admin_roles_manual.sql`
2. Te promouvoir admin : `update profiles set role = 'admin' where id = '...'`
3. Guide complet : **[docs/ADMIN.md](../docs/ADMIN.md)**

## Tables principales

| Table | Description |
|-------|-------------|
| `profiles` | Portefeuille + pseudo (créé au signup) |
| `matches` / `teams` | Cache des fixtures |
| `bets` | Paris utilisateurs |
| `transactions` | Historique des mouvements |
