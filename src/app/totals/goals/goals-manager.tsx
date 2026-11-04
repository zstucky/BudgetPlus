"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { deleteGoal, saveGoal, type Goal } from "../actions";

function money(amount: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount); }

export default function GoalsManager({ initialGoals, today, startAmount }: { initialGoals: Goal[]; today: string; startAmount: number }) {
  const [year, month, day] = today.split("-").map(Number);
  const minTargetDate = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  const [goals, setGoals] = useState(initialGoals);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formCardRef = useRef<HTMLElement>(null);
  const [editYear, editMonth, editDay] = (editing?.start_date ?? today).split("-").map(Number);
  const editMinTargetDate = new Date(Date.UTC(editYear, editMonth - 1, editDay + 1)).toISOString().slice(0, 10);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const wasEditing = Boolean(editing);
    const name = String(form.get("goal-name") ?? "");
    const target_amount = Number(form.get("target-amount"));
    const target_date = String(form.get("target-date") ?? "");
    const color = String(form.get("goal-color") ?? "#22C55E");
    setSaving(true); setError(null); setSavedMessage(null);
    try {
      const result = await saveGoal({ id: editing?.id, name, target_amount, target_date, color,
        start_amount: editing?.start_amount ?? startAmount,
        start_date: editing?.start_date ?? today,
      });
      if (result.error || !result.data) { setError(result.error ?? "Unable to save goal."); return; }
      setGoals((current) => [...current.filter((goal) => goal.id !== result.data!.id), result.data!].sort((a, b) => a.target_date.localeCompare(b.target_date)));
      formElement.reset();
      setEditing(null);
      setSavedMessage(wasEditing ? "Goal updated." : "Goal added.");
    } catch {
      setError("We couldn’t save that goal. Please try again.");
    } finally { setSaving(false); }
  }

  async function remove(goal: Goal) {
    setSaving(true); setError(null);
    try {
      const result = await deleteGoal(goal.id);
      if (result.error) { setError(result.error); return; }
      setGoals((current) => current.filter((item) => item.id !== goal.id));
      setConfirmDelete(false);
      setEditing(null);
    } catch {
      setError("We couldn’t delete that goal. Please try again.");
    } finally { setSaving(false); }
  }

  return <section className="monthly-content totals-content totals-goals-content" aria-labelledby="goals-title">
    <header className="monthly-heading"><h1 id="goals-title">Goals</h1></header>
    <Link href="/totals" className="totals-history-back">‹ Back to totals</Link>
    <section ref={formCardRef} className="monthly-calendar totals-goal-form-card" aria-labelledby="goal-form-title">
      <div className="monthly-list-heading"><h2 id="goal-form-title">{editing ? "Edit goal" : "Add a goal"}</h2></div>
      <form className="totals-form" onSubmit={submit} onChange={() => setSavedMessage(null)}>
        <label htmlFor="goal-name">Goal name</label><input id="goal-name" name="goal-name" required maxLength={80} placeholder="Pay off credit card" key={editing?.id ?? "new-name"} defaultValue={editing?.name ?? ""} />
        <div className="totals-form-grid"><div><label htmlFor="target-amount">Target amount</label><div className="monthly-amount-input"><span>$</span><input id="target-amount" name="target-amount" required type="number" min="0.01" max="9999999999.99" step="0.01" placeholder="10000.00" key={editing?.id ?? "new-amount"} defaultValue={editing?.target_amount ?? ""} /></div></div><div><label htmlFor="target-date">Target date</label><input id="target-date" name="target-date" required type="date" min={editing ? editMinTargetDate : minTargetDate} key={editing?.id ?? "new-date"} defaultValue={editing?.target_date ?? minTargetDate} /></div></div>
        <label htmlFor="goal-color">Line color</label><div className="totals-goal-color"><input id="goal-color" name="goal-color" type="color" defaultValue={editing?.color ?? "#22C55E"} key={editing?.id ?? "new-color"} /><span>{editing ? "Update the color shown on your chart." : "Your goal line will appear in this color."}</span></div>
        <div className={`totals-goal-form-actions${editing ? " totals-goal-form-actions-editing" : ""}`}>
          <button type="submit" className="totals-primary-button" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add goal"}</button>
          {editing && (confirmDelete ? <>
            <p className="totals-goal-delete-prompt">Delete <strong>{editing.name}</strong>? This can&apos;t be undone.</p>
            <button type="button" className="totals-secondary-button" disabled={saving} onClick={() => { setConfirmDelete(false); setError(null); }}>Cancel</button>
            <button type="button" className="totals-delete-confirm" disabled={saving} onClick={() => remove(editing)}>{saving ? "Deleting…" : "Delete goal"}</button>
          </> : <>
            <button type="button" className="totals-secondary-button" disabled={saving} onClick={() => { setEditing(null); setConfirmDelete(false); setError(null); }}>Cancel</button>
            <button type="button" className="totals-goal-delete-trigger" disabled={saving} onClick={() => { setConfirmDelete(true); setError(null); }}>Delete goal</button>
          </>)}
        </div>
        {savedMessage && <p className="totals-goal-saved" role="status">{savedMessage}</p>}
        {error && <p className="monthly-error" role="alert">{error}</p>}
      </form>
    </section>
    <section className="monthly-bills totals-goals-list" aria-labelledby="your-goals-title">
      <div className="monthly-list-heading"><h2 id="your-goals-title">Your goals</h2><span>{goals.length}</span></div>
      {goals.length ? <ul>{goals.map((goal) => <li key={goal.id} className="totals-goal-row"><span className="totals-goal-swatch" style={{ backgroundColor: goal.color }} aria-hidden="true" /><div className="totals-goal-copy"><strong>{goal.name}</strong><span>Target date <time dateTime={goal.target_date}>{new Date(`${goal.target_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time></span></div><div className="totals-goal-side"><div className="totals-goal-amount"><strong>{money(goal.target_amount)}</strong></div><div className="totals-goal-actions"><button type="button" className="totals-goal-edit" onClick={() => { setEditing(goal); setConfirmDelete(false); setError(null); setSavedMessage(null); formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Edit</button></div></div></li>)}</ul> : <p className="totals-goals-empty">Add a goal to see its trajectory on your net worth chart.</p>}
    </section>
  </section>;
}
