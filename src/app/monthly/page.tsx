import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "../bottom-nav";
import MonthlyDashboard, { type MonthlyReminder, type RecurringBill } from "./monthly-dashboard";

export default async function MonthlyPage() {
  const membership = await getCurrentMembership();
  if (!membership.userId) redirect("/login");
  if (membership.error) return <MonthlyLoadError message={membership.error} />;
  if (!membership.householdId) redirect("/setup-household");

  const supabase = await createClient();
  const [{ data, error }, { data: reminderData, error: reminderError }] = await Promise.all([
    supabase
      .from("recurring_bills")
      .select("id, name, amount, due_day, is_autopay")
      .eq("household_id", membership.householdId)
      .order("due_day", { ascending: true }),
    supabase
      .from("monthly_reminders")
      .select("id, description, reminder_date")
      .eq("household_id", membership.householdId)
      .order("reminder_date", { ascending: true }),
  ]);

  if (error || reminderError) return <MonthlyLoadError message={error?.message ?? reminderError?.message ?? "Unable to load monthly data."} />;

  const bills: RecurringBill[] = (data ?? []).map((bill) => ({
    id: bill.id,
    name: bill.name,
    amount: Number(bill.amount),
    due_day: bill.due_day,
    is_autopay: bill.is_autopay,
  }));
  const reminders: MonthlyReminder[] = (reminderData ?? []).map((reminder) => ({
    id: reminder.id,
    description: reminder.description,
    reminder_date: reminder.reminder_date,
  }));

  return (
    <main className="monthly-page">
      <BottomNav />
      <MonthlyDashboard initialBills={bills} initialReminders={reminders} />
    </main>
  );
}

function MonthlyLoadError({ message }: { message: string }) {
  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content">
        <h1>Monthly</h1>
        <p className="monthly-error" role="alert">We couldn&apos;t load monthly items: {message}</p>
      </section>
    </main>
  );
}
