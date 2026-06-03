"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  isLegacyEmailLogin,
  normalizeUsername,
  usernameToAuthEmail,
  validateUsernameInput,
} from "@/lib/auth/username";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmed = login.trim();
    let email: string;

    if (isLegacyEmailLogin(trimmed)) {
      email = trimmed.toLowerCase();
    } else {
      const pseudo = normalizeUsername(trimmed);
      const validationError = validateUsernameInput(pseudo);
      if (validationError) {
        setError(validationError);
        setLoading(false);
        return;
      }
      email = usernameToAuthEmail(pseudo);
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Pseudo ou mot de passe incorrect."
          : signInError.message,
      );
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login">Pseudo</Label>
          <Input
            id="login"
            type="text"
            autoComplete="username"
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="mon_pseudo"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Compte ancien avec email ? Saisissez votre email à la place du pseudo.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
