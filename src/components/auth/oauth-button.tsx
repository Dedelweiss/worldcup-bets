"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthRedirectUrl } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function OAuthButton() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl("/auth/callback"),
      },
    });
    if (error) {
      setLoading(false);
      console.error(error.message);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={loading}
      onClick={signInWithGoogle}
    >
      {loading ? "Redirection…" : "Continuer avec Google"}
    </Button>
  );
}
