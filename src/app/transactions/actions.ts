"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";

export async function addTransaction(
  amount: number,
  description: string,
): Promise<{ error: string | null }> {
  const membership = await getCurrentMembership();

  if (!membership.userId) {
    return { error: "You must be logged in." };
  }

  if (membership.error) {
    return { error: membership.error };
  }

  if (!membership.householdId) {
    return { error: "You do not belong to a household." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("transactions")
    .insert({
      household_id: membership.householdId,
      amount,
      description,
    });

  return {
    error: error?.message ?? null,
  };
}

export async function resetTransactions(): Promise<{ error: string | null }> {
  const membership = await getCurrentMembership();

  if (!membership.userId) {
    return { error: "You must be logged in." };
  }

  if (membership.error) {
    return { error: membership.error };
  }

  if (!membership.householdId) {
    return { error: "You do not belong to a household." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("household_id", membership.householdId);

  return {
    error: error?.message ?? null,
  };
}