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
          Choisissez un pseudo et pariez avec vos amis sur la Coupe du Monde 2026
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
