import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "../bottom-nav";
import HouseholdForm from "./household-form";

export default async function HouseholdPage() {
  const membership = await getCurrentMembership();

  if (!membership.userId) {
    redirect("/login");
  }

  if (membership.error) {
    return (
      <main className="monthly-page">
        <BottomNav />
        <section className="monthly-content settings-content">
          <header className="monthly-heading"><h1>Household</h1></header>
          <p className="monthly-error" role="alert">We couldn&apos;t load your household: {membership.error}</p>
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
      <main className="monthly-page">
        <BottomNav />
        <section className="monthly-content settings-content">
          <header className="monthly-heading"><h1>Household</h1></header>
          <p className="monthly-error" role="alert">We couldn&apos;t load your household: {householdError?.message ?? "Household not found."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content settings-content" aria-labelledby="settings-title">
        <header className="monthly-heading">
          <h1 id="settings-title">Household</h1>
        </header>
        <section className="monthly-bills settings-card" aria-labelledby="household-details-title">
          <div className="monthly-list-heading"><h2 id="household-details-title">Household details</h2></div>
          <p className="settings-description">Update your household name and weekly budget.</p>
          <HouseholdForm name={household.name} weeklyBudget={Number(household.weekly_budget)} />
        </section>
      </section>
    </main>
  );
}
