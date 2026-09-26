import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "../bottom-nav";
import LessonsDashboard, { type Lesson, type LessonMonth } from "./lessons-dashboard";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function LessonsPage() {
  const membership = await getCurrentMembership();
  if (!membership.userId) redirect("/login");
  if (membership.error) return <LessonsLoadError message={membership.error} />;
  if (!membership.householdId) redirect("/setup-household");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstChartMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startKey = dateKey(firstChartMonth);
  const endKey = dateKey(nextMonth);
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("id, amount, lesson_date, description")
    .eq("household_id", membership.householdId)
    .gte("lesson_date", startKey)
    .lt("lesson_date", endKey)
    .order("lesson_date", { ascending: false });

  if (error) return <LessonsLoadError message={error.message} />;

  const lessons: Lesson[] = (data ?? []).map((lesson) => ({
    id: lesson.id,
    amount: Number(lesson.amount),
    lesson_date: lesson.lesson_date,
    description: lesson.description?.trim() || "Lesson",
  }));
  const totals = new Map<string, number>();
  for (const lesson of lessons) {
    const key = lesson.lesson_date.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + lesson.amount);
  }
  const months: LessonMonth[] = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(firstChartMonth.getFullYear(), firstChartMonth.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: date.toLocaleDateString("en-US", { month: "short" }),
      total: totals.get(key) ?? 0,
    };
  });

  return (
    <main className="monthly-page">
      <BottomNav />
      <LessonsDashboard
        initialLessons={lessons.filter((lesson) => lesson.lesson_date.startsWith(currentMonthKey))}
        initialMonths={months}
        currentDate={dateKey(now)}
        currentMonthLabel={monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      />
    </main>
  );
}

function LessonsLoadError({ message }: { message: string }) {
  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content">
        <h1>Lessons</h1>
        <p className="monthly-error" role="alert">We couldn&apos;t load lessons: {message}</p>
      </section>
    </main>
  );
}
