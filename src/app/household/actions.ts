"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";

export type HouseholdFormState = {
  error?: string;
};

export async function updateHousehold(
  _: HouseholdFormState,
  formData: FormData,
): Promise<HouseholdFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const weeklyBudget = Number.parseFloat(
    String(formData.get("weeklyBudget") ?? ""),
  );

  if (!name) {
    return { error: "Enter a household name." };
  }

  if (!Number.isFinite(weeklyBudget) || weeklyBudget <= 0) {
    return { error: "Enter a weekly budget greater than $0." };
  }

  const membership = await getCurrentMembership();

  if (!membership.userId) {
    redirect("/login");
  }

  if (membership.error) {
    return {
      error: `Unable to verify your household: ${membership.error}`,
    };
  }

  if (!membership.householdId) {
    redirect("/setup-household");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("households")
    .update({
      name,
      weekly_budget: weeklyBudget,
    })
    .eq("id", membership.householdId);

  if (error) {
    return {
      error: `Unable to update household: ${error.message}`,
    };
  }

  redirect("/");
}