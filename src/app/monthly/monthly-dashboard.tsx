"use client";

import { useState, type FormEvent } from "react";
import { addRecurringBill, deleteRecurringBill } from "./actions";
import MonthlyCalendar from "./monthly-calendar";

export type RecurringBill = {
  id: string;
  name: string;
  amount: number;
  due_day: number;
};

export default function MonthlyDashboard({ initialBills }: { initialBills: RecurringBill[] }) {
  const [bills, setBills] = useState(initialBills);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const monthlyTotal = bills.reduce((total, bill) => total + bill.amount, 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const result = await addRecurringBill({ name, amount: Number(amount), dueDay: Number(dueDay) });
      if (result.error || !result.bill) {
        setError(result.error ?? "Unable to add recurring expense.");
        return;
      }
      setBills((current) => [...current, result.bill!].sort((a, b) => a.due_day - b.due_day));
      setName("");
      setAmount("");
      setDueDay("1");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(billId: string) {
    setError(null);
    setDeletingId(billId);
    try {
      const result = await deleteRecurringBill(billId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBills((current) => current.filter((bill) => bill.id !== billId));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="monthly-content" aria-labelledby="monthly-title">
      <header className="monthly-heading">
        <h1 id="monthly-title">Monthly</h1>
      </header>

      <MonthlyCalendar bills={bills} />

      <section className="monthly-bills" aria-labelledby="bills-title">
        <div className="monthly-list-heading">
          <h2 id="bills-title">Recurring bills</h2>
          <span>{bills.length}</span>
        </div>
        <div className="monthly-total-row">
          <span>Monthly expenses total</span>
          <strong>${monthlyTotal.toFixed(2)}</strong>
        </div>
        {bills.length === 0 ? (
          <p className="monthly-empty">Your recurring expenses will appear here.</p>
        ) : (
          <ul>
            {bills.map((bill) => (
              <li key={bill.id}>
                <div className="bill-details">
                  <strong>{bill.name}</strong>
                  <span>Due on day {bill.due_day}</span>
                </div>
                <strong className="bill-amount">${bill.amount.toFixed(2)}</strong>
                <button
                  type="button"
                  className="bill-delete"
                  aria-label={`Delete ${bill.name}`}
                  disabled={deletingId === bill.id}
                  onClick={() => handleDelete(bill.id)}
                >
                  {deletingId === bill.id ? "…" : "×"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form className="monthly-form" onSubmit={handleSubmit}>
        <h2>Add an expense</h2>
        <div className="monthly-form-fields">
          <div>
            <label htmlFor="bill-name">Name</label>
            <input
              id="bill-name"
              required
              maxLength={100}
              placeholder="Rent, etc..."
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="bill-amount">Amount</label>
            <div className="monthly-amount-input">
              <span aria-hidden="true">$</span>
              <input
                id="bill-amount"
                required
                type="number"
                inputMode="decimal"
                min="0.01"
                max="99999999.99"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="bill-due-day">Due day</label>
            <select id="bill-due-day" value={dueDay} onChange={(event) => setDueDay(event.target.value)}>
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={isSaving}>{isSaving ? "Adding..." : "Add expense"}</button>
        {error && <p className="monthly-error" role="alert">{error}</p>}
      </form>
    </section>
  );
}
