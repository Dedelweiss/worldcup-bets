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

## 3. Authentification Email

**Authentication → Providers → Email** : activé par défaut.

Pour le dev sans confirmation email :

- **Authentication → Providers → Email** → désactiver **Confirm email**

## 4. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → Credentials → OAuth 2.0 Client ID
2. **Authorized redirect URIs** :
   ```
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```
3. Supabase → **Authentication → Providers → Google** : coller Client ID + Secret
4. **Authentication → URL Configuration** → **Redirect URLs** :
   ```
   http://localhost:3000/auth/callback
   https://votre-domaine.vercel.app/auth/callback
   ```

## 5. Vérification

```bash
npm run dev
```

- Créer un compte sur `/signup`
- Vérifier dans **Table Editor → profiles** : `balance = 100`
- Vérifier **transactions** : ligne `signup_bonus`
- Dashboard : matchs issus de `seed.sql`

## Tables principales

| Table | Description |
|-------|-------------|
| `profiles` | Portefeuille + pseudo (créé au signup) |
| `matches` / `teams` | Cache des fixtures |
| `bets` | Paris utilisateurs |
| `transactions` | Historique des mouvements |
