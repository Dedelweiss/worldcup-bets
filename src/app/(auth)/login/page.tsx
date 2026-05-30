import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Connexion · WC2026 Pool",
};

function LoginFormFallback() {
  return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
}

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md border-border/80">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Connexion</CardTitle>
        <CardDescription>
          Accédez à votre portefeuille virtuel et pariez avec vos amis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
