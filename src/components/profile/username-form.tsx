"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateUsernameAction } from "@/app/(app)/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UsernameFormProps {
  currentUsername: string | null;
}

export function UsernameForm({ currentUsername }: UsernameFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(currentUsername ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await updateUsernameAction(value);
    if (!result.success) {
      setError(result.error);
    } else {
      setValue(result.username);
      setMessage("Pseudo enregistré.");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mon pseudo</CardTitle>
        <CardDescription>
          Visible dans le classement et pendant les matchs en direct. Lettres
          minuscules, chiffres et _ uniquement (3–20 caractères).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="username">Pseudo</Label>
            <Input
              id="username"
              value={value}
              onChange={(e) => setValue(e.target.value.toLowerCase())}
              placeholder="mon_pseudo"
              autoComplete="nickname"
              minLength={3}
              maxLength={20}
              pattern="[a-z0-9_]+"
              required
              className="font-mono"
            />
          </div>
          <Button type="submit" disabled={loading} className="sm:mb-0.5">
            {loading ? "…" : currentUsername ? "Mettre à jour" : "Enregistrer"}
          </Button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {message && <p className="mt-3 text-sm text-primary">{message}</p>}
      </CardContent>
    </Card>
  );
}
