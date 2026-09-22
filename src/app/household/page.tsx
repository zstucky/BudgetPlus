import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import HouseholdForm from "./household-form";

export default async function HouseholdPage() {
  const membership = await getCurrentMembership();

  if (!membership.userId) {
    redirect("/login");
  }

  if (membership.error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="auth-brand">Weekly Budget</p>
          <h1>We couldn&apos;t load your household</h1>
          <p className="auth-error">{membership.error}</p>
        </section>
      </main>
    );
  }

  if (!membership.householdId) {
    redirect("/setup-household");
  }

  const supabase = await createClient();

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("name, weekly_budget")
    .eq("id", membership.householdId)
    .single();

  if (householdError || !household) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="auth-brand">Weekly Budget</p>
          <h1>We couldn&apos;t load your household</h1>
          <p className="auth-error">
            {householdError?.message ?? "Household not found."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-brand">Weekly Budget</p>

        <h1>Edit Household</h1>

        <p className="auth-copy">
          Update your household name or weekly budget.
        </p>

        <HouseholdForm
          name={household.name}
          weeklyBudget={Number(household.weekly_budget)}
        />
      </section>
    </main>
  );
}