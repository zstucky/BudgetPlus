import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "../../bottom-nav";
import HistoryList from "./history-list";

export default async function TotalsHistoryPage() {
  const membership = await getCurrentMembership();
  if (!membership.userId) redirect("/login");
  if (membership.error) return <HistoryLoadError message={membership.error} />;
  if (!membership.householdId) redirect("/setup-household");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("total_snapshots")
    .select("id, total, created_at")
    .eq("household_id", membership.householdId)
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) return <HistoryLoadError message={error.message} />;
  const snapshots = (data ?? []).reverse().map((snapshot) => ({ ...snapshot, total: Number(snapshot.total) }));

  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content totals-history-content" aria-labelledby="totals-history-title">
        <header className="monthly-heading">
          <h1 id="totals-history-title">Total history</h1>
        </header>
        <Link href="/totals" className="totals-history-back">‹ Back to Totals</Link>
        <HistoryList initialSnapshots={snapshots} />
      </section>
    </main>
  );
}

function HistoryLoadError({ message }: { message: string }) {
  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content totals-history-content">
        <header className="monthly-heading"><h1>Total History</h1></header>
        <p className="monthly-error" role="alert">We couldn&apos;t load your total history: {message}</p>
      </section>
    </main>
  );
}
