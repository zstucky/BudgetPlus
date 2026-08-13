"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";

export type SetupFormState = {
  error?: string;
};

export async function createHousehold(
  _: SetupFormState,
  formData: FormData,
): Promise<SetupFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const weeklyBudget = Number.parseFloat(String(formData.get("weeklyBudget") ?? ""));

  if (!name) return { error: "Enter a household name." };
  if (!Number.isFinite(weeklyBudget) || weeklyBudget <= 0) {
    return { error: "Enter a weekly budget greater than $0." };
  }

  const membership = await getCurrentMembership();
  if (!membership.userId) redirect("/login");
  if (membership.error) return { error: `Unable to verify your household: ${membership.error}` };
  if (membership.householdId) redirect("/");

  const supabase = await createClient();
  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({ name, weekly_budget: weeklyBudget, created_by: membership.userId })
    .select("id")
    .single();

  if (householdError || !household) {
    return { error: householdError?.message ?? "Unable to create the household." };
  }

  const { error: memberError } = await supabase.from("household_members").insert({
    household_id: household.id,
    user_id: membership.userId,
  });

  if (memberError) {
    return {
      error: `Your household was created, but we could not add you as a member: ${memberError.message}`,
    };
  }

  redirect("/");
}
