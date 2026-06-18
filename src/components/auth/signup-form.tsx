"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignupAvatarPicker } from "@/components/profile/signup-avatar-picker";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeUsername,
  usernameToAuthEmail,
  validateUsernameInput,
} from "@/lib/auth/username";
import { DEFAULT_AVATAR_ID } from "@/lib/profile/avatars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const pseudo = normalizeUsername(username);
    const validationError = validateUsernameInput(pseudo);
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: usernameToAuthEmail(pseudo),
      password,
      options: {
        data: {
          username: pseudo,
          avatar_id: avatarId,
        },
      },
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        setError("Ce pseudo est déjà pris.");
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setError(
      "Compte créé mais session inactive. Désactivez la confirmation email dans Supabase (Authentication → Email).",
    );
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Pseudo</Label>
          <Input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="mon_pseudo"
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_]+"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Lettres minuscules, chiffres et _ (3–20 caractères). C&apos;est votre
            identifiant de connexion.
          </p>
        </div>
        <SignupAvatarPicker value={avatarId} onChange={setAvatarId} />
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
        </div>
        <p className="rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          Après la création du compte, vous compléterez vos pronostics pour tout
          le tournoi (équipe favorite, buteur, finalistes…).
        </p>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Création…" : "Créer mon compte"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Aucun email personnel requis — connexion par pseudo uniquement.
      </p>
    </div>
  );
}
