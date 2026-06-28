"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  ACTIVE_SPORT_COOKIE,
  type ActiveSport,
  parseActiveSport,
} from "@/lib/sport/constants";
import { requireAuth } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function setActiveSportAction(sport: ActiveSport): Promise<void> {
  const parsed = parseActiveSport(sport);
  const profile = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_active_sport", {
    p_sport: parsed,
  });

  if (error) {
    throw new Error(error.message);
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_SPORT_COOKIE, parsed, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
