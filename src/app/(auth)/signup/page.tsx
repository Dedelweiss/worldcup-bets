import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Inscription · WC2026 Pool",
};

export default function SignupPage() {
  return (
    <Card className="w-full max-w-md border-border/80">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Créer un compte</CardTitle>
        <CardDescription>
          Recevez <strong className="text-primary">100 €</strong> de monnaie virtuelle à
          l&apos;inscription
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
