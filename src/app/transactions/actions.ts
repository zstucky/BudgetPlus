"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";

export type WeeklyHistory = { id: string; amount_spent: number; budget_amount: number; reset_at: string };

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

export async function resetTransactions(): Promise<{ history: WeeklyHistory | null; error: string | null }> {
  const membership = await getCurrentMembership();

  if (!membership.userId) {
    return { history: null, error: "You must be logged in." };
  }

  if (membership.error) {
    return { history: null, error: membership.error };
  }

  if (!membership.householdId) {
    return { history: null, error: "You do not belong to a household." };
  }

  const supabase = await createClient();
  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("weekly_budget")
    .eq("id", membership.householdId)
    .single();
  if (householdError || !household) return { history: null, error: householdError?.message ?? "Household not found." };

  const { data: transactions, error: transactionError } = await supabase
    .from("transactions")
    .select("amount")
    .eq("household_id", membership.householdId);
  if (transactionError) return { history: null, error: transactionError.message };

  const amountSpent = (transactions ?? []).reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const { data: savedHistory, error: historyError } = await supabase
    .from("weekly_history")
    .insert({ household_id: membership.householdId, amount_spent: amountSpent.toFixed(2), budget_amount: Number(household.weekly_budget).toFixed(2) })
    .select("id, amount_spent, budget_amount, reset_at")
    .single();
  if (historyError || !savedHistory) return { history: null, error: historyError?.message ?? "Unable to save weekly history." };

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("household_id", membership.householdId);

  if (error) {
    const { error: cleanupError } = await supabase.from("weekly_history").delete()
      .eq("id", savedHistory.id)
      .eq("household_id", membership.householdId);
    const cleanupMessage = cleanupError ? ` The weekly history entry could not be removed: ${cleanupError.message}` : "";
    return { history: null, error: `${error.message}${cleanupMessage}` };
  }

  revalidatePath("/");
  return {
    history: { ...savedHistory, amount_spent: Number(savedHistory.amount_spent), budget_amount: Number(savedHistory.budget_amount) },
    error: null,
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
