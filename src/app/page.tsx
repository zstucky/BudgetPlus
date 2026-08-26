import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import Dashboard from "./dashboard";
import { getHouseholdTransactions } from "@/lib/transactions";

export default async function Home() {
  const membership = await getCurrentMembership();

  if (!membership.userId) redirect("/login");

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

  if (!membership.householdId) redirect("/setup-household");

  const supabase = await createClient();

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("weekly_budget")
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

  const transactions = await getHouseholdTransactions(
  membership.householdId,
  );

  console.log("Transactions from Supabase:", transactions);

  if (transactions.error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="auth-brand">Weekly Budget</p>
          <h1>We couldn&apos;t load your transactions</h1>
          <p className="auth-error">{transactions.error}</p>
        </section>
      </main>
    );
  }

  return (
    <Dashboard
      householdId={membership.householdId}
      weeklyBudget={Number(household.weekly_budget)}
    />
  );
}