"use client";

import { useState, type FormEvent } from "react";
import { addLesson, deleteLesson } from "./actions";

export type Lesson = { id: string; amount: number; lesson_date: string; description: string };
export type LessonMonth = { key: string; label: string; total: number };

function money(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function displayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function LessonsDashboard({
  initialLessons,
  initialMonths,
  currentDate,
  currentMonthLabel,
}: {
  initialLessons: Lesson[];
  initialMonths: LessonMonth[];
  currentDate: string;
  currentMonthLabel: string;
}) {
  const [lessons, setLessons] = useState(initialLessons);
  const [months, setMonths] = useState(initialMonths);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Lesson");
  const [lessonDate, setLessonDate] = useState(currentDate);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentTotal = lessons.reduce((sum, lesson) => sum + lesson.amount, 0);
  const maxTotal = Math.max(...months.map((month) => month.total), 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await addLesson({ amount: Number(amount), lessonDate, description });
      if (result.error || !result.lesson) {
        setError(result.error ?? "Unable to add lesson.");
        return;
      }
      const added = result.lesson;
      setLessons((current) => [added, ...current].sort((a, b) => b.lesson_date.localeCompare(a.lesson_date)));
      const monthKey = added.lesson_date.slice(0, 7);
      setMonths((current) => current.map((month) => month.key === monthKey ? { ...month, total: month.total + added.amount } : month));
      setAmount("");
      setDescription("Lesson");
      setLessonDate(currentDate);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(lesson: Lesson) {
    setError(null);
    setDeletingId(lesson.id);
    try {
      const result = await deleteLesson(lesson.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setLessons((current) => current.filter((entry) => entry.id !== lesson.id));
      const monthKey = lesson.lesson_date.slice(0, 7);
      setMonths((current) => current.map((month) => month.key === monthKey ? { ...month, total: Math.max(0, month.total - lesson.amount) } : month));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="monthly-content lessons-content" aria-labelledby="lessons-title">
      <header className="monthly-heading"><h1 id="lessons-title">Lessons</h1></header>

      <section className="monthly-calendar totals-chart-card lessons-chart-card" aria-labelledby="lessons-chart-title">
        <div className="calendar-heading">
          <div><p className="totals-kicker">Lessons - This Month</p><h2 id="lessons-chart-title">{money(currentTotal)}</h2></div>
          <span className="totals-chart-label">By month</span>
        </div>
        <div className="lessons-chart" role="img" aria-label={`Lesson income for the last six months: ${months.map((month) => `${month.label} ${money(month.total)}`).join(", ")}`}>
          {months.map((month) => {
            const height = maxTotal > 0 ? Math.max((month.total / maxTotal) * 100, month.total > 0 ? 5 : 0) : 0;
            return (
              <div className="lessons-bar-column" key={month.key}>
                <span className="lessons-bar-value">{month.total > 0 ? money(month.total) : "—"}</span>
                <div className="lessons-bar-track"><div className="lessons-bar" style={{ height: `${height}%` }} /></div>
                <span className="lessons-bar-label">{month.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <form className="monthly-form lessons-form" onSubmit={handleSubmit}>
        <h2>Add a lesson</h2>
        <div className="lessons-form-fields">
          <div>
            <label htmlFor="lesson-amount">Amount</label>
            <div className="monthly-amount-input"><span aria-hidden="true">$</span><input id="lesson-amount" required type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          </div>
          <div>
            <label htmlFor="lesson-date">Lesson date</label>
            <input id="lesson-date" type="date" required value={lessonDate} onChange={(event) => setLessonDate(event.target.value)} />
          </div>
          <div className="lessons-description-field">
            <label htmlFor="lesson-description">Description</label>
            <input id="lesson-description" type="text" required maxLength={120} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
        </div>
        <button type="submit" disabled={saving}>{saving ? "Adding..." : "Add lesson"}</button>
        {error && <p className="monthly-error" role="alert">{error}</p>}
      </form>

      <section className="monthly-bills lessons-list" aria-labelledby="lesson-list-title">
        <div className="monthly-list-heading"><h2 id="lesson-list-title">{currentMonthLabel}</h2><span>{lessons.length}</span></div>
        <div className="monthly-total-row"><span>This month&apos;s lesson income</span><strong>{money(currentTotal)}</strong></div>
        {lessons.length === 0 ? <p className="monthly-empty">Lessons you add this month will appear here.</p> : (
          <ul>{lessons.map((lesson) => (
            <li key={lesson.id}>
              <div className="bill-details"><strong>{lesson.description}</strong><span>{displayDate(lesson.lesson_date)}</span></div>
              <strong className="bill-amount">{money(lesson.amount)}</strong>
              <button type="button" className="bill-delete" aria-label={`Delete lesson for ${money(lesson.amount)} on ${displayDate(lesson.lesson_date)}`} disabled={deletingId === lesson.id} onClick={() => handleDelete(lesson)}>{deletingId === lesson.id ? "…" : "×"}</button>
            </li>
          ))}</ul>
        )}
        {error && lessons.length > 0 && <p className="monthly-error" role="alert">{error}</p>}
      </section>
    </section>
  );
}
