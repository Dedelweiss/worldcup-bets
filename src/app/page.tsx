import { redirect } from "next/navigation";
import { getSessionUser, hasSupabaseConfig } from "@/lib/auth-server";

export default async function HomePage() {
  if (hasSupabaseConfig) {
    const user = await getSessionUser();
    redirect(user ? "/dashboard" : "/login");
  }
  redirect("/dashboard");
}
