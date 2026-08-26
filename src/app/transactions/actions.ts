"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";

export async function addTransaction(
  amount: number,
  description: string,
): Promise<{
  transaction: {
    id: string;
    amount: number;
    description: string;
    created_at: string;
  } | null;
  error: string | null;
}> {
  const membership = await getCurrentMembership();

  if (!membership.userId) {
    return {
      transaction: null,
      error: "You must be logged in.",
    };
  }

  if (membership.error) {
    return {
      transaction: null,
      error: membership.error,
    };
  }

  if (!membership.householdId) {
    return {
      transaction: null,
      error: "You do not belong to a household.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      household_id: membership.householdId,
      amount,
      description,
    })
    .select("id, amount, description, created_at")
    .single();

  if (error || !data) {
    return {
      transaction: null,
      error: error?.message ?? "Unable to create transaction.",
    };
  }

  return {
    transaction: data,
    error: null,
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

export async function deleteTransaction(
  transactionId: string,
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
    .delete()
    .eq("id", transactionId)
    .eq("household_id", membership.householdId);

  return {
    error: error?.message ?? null,
  };
}