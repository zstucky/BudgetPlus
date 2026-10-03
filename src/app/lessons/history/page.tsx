import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "../../bottom-nav";

type LessonRow = {
  id: string;
  amount: number | string;
  lesson_date: string;
  description: string | null;
  type: string;
};

type LessonEntry = Omit<LessonRow, "amount" | "description" | "type"> & {
  amount: number;
  description: string;
  type: "income" | "expense";
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function LessonsHistoryPage() {
  const membership = await getCurrentMembership();
  if (!membership.userId) redirect("/login");
  if (membership.error) return <LessonsHistoryLoadError message={membership.error} />;
  if (!membership.householdId) redirect("/setup-household");

  const supabase = await createClient();
  const pageSize = 1000;
  const rows: LessonRow[] = [];
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from("lessons")
      .select("id, amount, lesson_date, description, type")
      .eq("household_id", membership.householdId)
      .order("lesson_date", { ascending: false })
      .order("id", { ascending: false })
      .range(start, start + pageSize - 1);

    if (error) return <LessonsHistoryLoadError message={error.message} />;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  const byMonth = new Map<string, LessonEntry[]>();
  for (const row of rows) {
    const monthKey = row.lesson_date.slice(0, 7);
    const entries = byMonth.get(monthKey) ?? [];
    entries.push({
      id: row.id,
      amount: Number(row.amount),
      lesson_date: row.lesson_date,
      description: row.description?.trim() || "Lesson",
      type: row.type === "expense" ? "expense" : "income",
    });
    byMonth.set(monthKey, entries);
  }

  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content lessons-history-content" aria-labelledby="lessons-history-title">
        <header className="monthly-heading"><h1 id="lessons-history-title">Lessons By Month</h1></header>
        <Link href="/lessons" className="totals-history-back">‹ Back to Lessons</Link>
        {byMonth.size === 0 ? (
          <section className="monthly-bills"><p className="monthly-empty">Your lesson history will appear here.</p></section>
        ) : (
          [...byMonth.entries()].map(([monthKey, entries]) => {
            const [year, month] = monthKey.split("-").map(Number);
            const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
            const income = entries.reduce((sum, entry) => sum + (entry.type === "income" ? entry.amount : 0), 0);
            const expenses = entries.reduce((sum, entry) => sum + (entry.type === "expense" ? entry.amount : 0), 0);
            return (
              <section className="monthly-bills lessons-history-month" key={monthKey} aria-labelledby={`month-${monthKey}`}>
                <div className="monthly-list-heading"><h2 id={`month-${monthKey}`}>{monthLabel}</h2><span>{entries.length}</span></div>
                <div className="lessons-history-totals">
                  <span>Income <strong>{money(income)}</strong></span>
                  <span>Expenses <strong>{money(expenses)}</strong></span>
                  <span>Net <strong className={income - expenses < 0 ? "lessons-expense-amount" : ""}>{money(income - expenses)}</strong></span>
                </div>
                <ul>
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <div className="bill-details"><strong>{entry.description}</strong><span>{formatDate(entry.lesson_date)}</span></div>
                      <strong className={`bill-amount${entry.type === "expense" ? " lessons-expense-amount" : ""}`}>
                        {entry.type === "expense" ? "−" : "+"}{money(entry.amount)}
                      </strong>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </section>
    </main>
  );
}

function LessonsHistoryLoadError({ message }: { message: string }) {
  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content lessons-history-content">
        <header className="monthly-heading"><h1>Lessons By Month</h1></header>
        <p className="monthly-error" role="alert">We couldn&apos;t load lesson history: {message}</p>
      </section>
    </main>
  );
}
