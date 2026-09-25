import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "../bottom-nav";
import MonthlyDashboard, { type RecurringBill } from "./monthly-dashboard";

export default async function MonthlyPage() {
  const membership = await getCurrentMembership();
  if (!membership.userId) redirect("/login");
  if (membership.error) return <MonthlyLoadError message={membership.error} />;
  if (!membership.householdId) redirect("/setup-household");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_bills")
    .select("id, name, amount, due_day")
    .eq("household_id", membership.householdId)
    .order("due_day", { ascending: true });

  if (error) return <MonthlyLoadError message={error.message} />;

  const bills: RecurringBill[] = (data ?? []).map((bill) => ({
    id: bill.id,
    name: bill.name,
    amount: Number(bill.amount),
    due_day: bill.due_day,
  }));

  return (
    <main className="monthly-page">
      <BottomNav />
      <MonthlyDashboard initialBills={bills} />
    </main>
  );
}

function MonthlyLoadError({ message }: { message: string }) {
  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content">
        <h1>Monthly</h1>
        <p className="monthly-error" role="alert">We couldn&apos;t load recurring expenses: {message}</p>
      </section>
    </main>
  );
}
