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

  const { data: weeklyHistory, error: weeklyHistoryError } = await supabase
    .from("weekly_history")
    .select("id, amount_spent, budget_amount, reset_at")
    .eq("household_id", membership.householdId)
    .order("reset_at", { ascending: false })
    .limit(8);

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

  if (weeklyHistoryError) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="auth-brand">Weekly Budget</p>
          <h1>We couldn&apos;t load your weekly history</h1>
          <p className="auth-error">{weeklyHistoryError.message}</p>
        </section>
      </main>
    );
  }

  return (
    <Dashboard
      householdId={membership.householdId}
      weeklyBudget={Number(household.weekly_budget)}
      initialExpenses={transactions.data}
      initialHistory={(weeklyHistory ?? []).reverse().map((entry) => ({
        ...entry,
        amount_spent: Number(entry.amount_spent),
        budget_amount: Number(entry.budget_amount),
      }))}
    />
  );
}
