"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";

export async function placeF1RaceWinnerBetAction(params: {
  meetingKey: number;
  driverNumber: number;
  odd: number;
  useBoost?: boolean;
}): Promise<void> {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.rpc("place_f1_race_winner_bet", {
    p_meeting_key: params.meetingKey,
    p_driver_number: params.driverNumber,
    p_odd: params.odd,
    p_use_boost: params.useBoost ?? false,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/f1/${params.meetingKey}`);
  revalidatePath("/f1");
}

export async function placeF1RaceOrderBetAction(params: {
  meetingKey: number;
  order: number[];
  useBoost?: boolean;
}): Promise<void> {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.rpc("place_f1_race_order_bet", {
    p_meeting_key: params.meetingKey,
    p_order: params.order,
    p_use_boost: params.useBoost ?? false,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/f1/${params.meetingKey}`);
  revalidatePath("/f1");
}

export async function placeF1PoleBetAction(params: {
  meetingKey: number;
  driverNumber: number;
  odd: number;
}): Promise<void> {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.rpc("place_f1_pole_bet", {
    p_meeting_key: params.meetingKey,
    p_driver_number: params.driverNumber,
    p_odd: params.odd,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/f1/${params.meetingKey}`);
  revalidatePath("/f1");
}

export async function placeF1TeammateDuelAction(params: {
  meetingKey: number;
  driverNumber: number;
  teammateNumber: number;
  odd: number;
}): Promise<void> {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.rpc("place_f1_teammate_duel_bet", {
    p_meeting_key: params.meetingKey,
    p_driver_number: params.driverNumber,
    p_teammate_number: params.teammateNumber,
    p_odd: params.odd,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/f1/${params.meetingKey}`);
  revalidatePath("/f1");
}
