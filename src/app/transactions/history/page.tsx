import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "../../bottom-nav";

export default async function TransactionHistoryPage() {
  const membership = await getCurrentMembership();
  if (!membership.userId) redirect("/login");
  if (membership.error) return <HistoryLoadError message={membership.error} />;
  if (!membership.householdId) redirect("/setup-household");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, amount, description, transaction_date, created_at")
    .eq("household_id", membership.householdId)
    .eq("active", false)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return <HistoryLoadError message={error.message} />;

  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content totals-history-content" aria-labelledby="transaction-history-title">
        <header className="monthly-heading"><h1 id="transaction-history-title">Transaction history</h1></header>
        <Link href="/" className="totals-history-back">‹ Back to Weekly</Link>
        <section className="monthly-bills totals-history-list" aria-label="Inactive transactions">
          {!data?.length ? (
            <p className="monthly-empty">Transactions from completed weeks will appear here.</p>
          ) : (
            <ul>
              {data.map((transaction) => (
                <li key={transaction.id}>
                  <div className="bill-details">
                    <strong>{transaction.description}</strong>
                    <span>{formatDate(transaction.transaction_date)}</span>
                  </div>
                  <strong className="transaction-history-amount">−${Number(transaction.amount).toFixed(2)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function HistoryLoadError({ message }: { message: string }) {
  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content totals-history-content">
        <header className="monthly-heading"><h1>Transaction history</h1></header>
        <p className="monthly-error" role="alert">We couldn&apos;t load your transaction history: {message}</p>
      </section>
    </main>
  );
}
