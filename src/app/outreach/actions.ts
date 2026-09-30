"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";

export type OutreachIncome = { id: string; amount: number; description: string; created_at: string };
export type OutreachSpend = { id: string; amount: number; description: string; impact: string | null; created_at: string };

function validateEntry(amountValue: unknown, descriptionValue: unknown) {
  const amount = Number(amountValue);
  const description = typeof descriptionValue === "string" ? descriptionValue.trim() : "";
  if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) return { error: "Enter an amount greater than zero." };
  if (!description) return { error: "Enter a short description." };
  if (description.length > 120) return { error: "Descriptions must be 120 characters or fewer." };
  return { amount, description };
}

export async function addOutreachIncome(input: { amount: number; description: string }): Promise<{ entry: OutreachIncome | null; error: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { entry: null, error: "You must be logged in." };
  if (membership.error) return { entry: null, error: membership.error };
  if (!membership.householdId) return { entry: null, error: "You do not belong to a household." };
  if (!input || typeof input !== "object") return { entry: null, error: "Enter valid income details." };
  const valid = validateEntry(input.amount, input.description);
  if ("error" in valid) return { entry: null, error: valid.error };

  const supabase = await createClient();
  const { data, error } = await supabase.from("outreach_income")
    .insert({ household_id: membership.householdId, amount: valid.amount.toFixed(2), description: valid.description })
    .select("id, amount, description, created_at").single();
  if (error || !data) return { entry: null, error: error?.message ?? "Unable to add money." };
  revalidatePath("/outreach");
  return { entry: { ...data, amount: Number(data.amount) }, error: null };
}

export async function addOutreachSpend(input: { amount: number; description: string }): Promise<{ entry: OutreachSpend | null; error: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { entry: null, error: "You must be logged in." };
  if (membership.error) return { entry: null, error: membership.error };
  if (!membership.householdId) return { entry: null, error: "You do not belong to a household." };
  if (!input || typeof input !== "object") return { entry: null, error: "Enter valid spending details." };
  const valid = validateEntry(input.amount, input.description);
  if ("error" in valid) return { entry: null, error: valid.error };

  const supabase = await createClient();
  const { data, error } = await supabase.from("outreach_spends")
    .insert({ household_id: membership.householdId, amount: valid.amount.toFixed(2), description: valid.description })
    .select("id, amount, description, impact, created_at").single();
  if (error || !data) return { entry: null, error: error?.message ?? "Unable to add spend." };
  revalidatePath("/outreach");
  return { entry: { ...data, amount: Number(data.amount) }, error: null };
}

export async function updateOutreachImpact(input: { spendId: string; impact: string }): Promise<{ impact: string | null; error: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { impact: null, error: "You must be logged in." };
  if (membership.error) return { impact: null, error: membership.error };
  if (!membership.householdId) return { impact: null, error: "You do not belong to a household." };
  if (!input || typeof input !== "object" || !/^[0-9a-f-]{36}$/i.test(input.spendId)) return { impact: null, error: "Choose a valid spend." };
  const impact = typeof input.impact === "string" ? input.impact.trim() : "";
  if (impact.length > 5000) return { impact: null, error: "Impact must be 5,000 characters or fewer." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("outreach_spends")
    .update({ impact: impact || null })
    .eq("id", input.spendId)
    .eq("household_id", membership.householdId)
    .select("impact").maybeSingle();
  if (error || !data) return { impact: null, error: error?.message ?? "Spend not found." };
  revalidatePath("/outreach");
  return { impact: data.impact, error: null };
}
