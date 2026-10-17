import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "../../../bottom-nav";
import type { UnexpectedExpense } from "@/app/transactions/actions";
import UnexpectedExpenseHistoryList from "./history-list";

export default async function UnexpectedExpenseHistoryPage() {
  const membership = await getCurrentMembership();
  if (!membership.userId) redirect("/login");
  if (membership.error) return <HistoryLoadError message={membership.error} />;
  if (!membership.householdId) redirect("/setup-household");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("unexpected_expenses")
    .select("id, amount, description, expense_date, created_at")
    .eq("household_id", membership.householdId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return <HistoryLoadError message={error.message} />;
  const expenses: UnexpectedExpense[] = (data ?? []).map((expense) => ({ ...expense, amount: Number(expense.amount) }));

  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content totals-history-content" aria-labelledby="unexpected-history-title">
        <header className="monthly-heading"><h1 id="unexpected-history-title">History</h1></header>
        <Link href="/totals" className="totals-history-back">‹ Back to Totals</Link>
        <UnexpectedExpenseHistoryList initialExpenses={expenses} />
      </section>
    </main>
  );
}

function HistoryLoadError({ message }: { message: string }) {
  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content totals-history-content">
        <header className="monthly-heading"><h1>History</h1></header>
        <p className="monthly-error" role="alert">We couldn&apos;t load your unexpected expenses: {message}</p>
      </section>
    </main>
  );
}
