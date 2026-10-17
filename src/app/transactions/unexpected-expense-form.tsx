"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { addUnexpectedExpense } from "./actions";

export default function UnexpectedExpenseForm({ today }: { today: string }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSaving(true);
    try {
      const result = await addUnexpectedExpense({ amount: Number(amount), description, expenseDate });
      if (result.error || !result.expense) {
        setHasError(true);
        setMessage(result.error ?? "Unable to save unexpected expense.");
        return;
      }
      setHasError(false);
      setMessage("Unexpected expense saved.");
      setAmount("");
      setDescription("");
      setExpenseDate(today);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="unexpected-expense-form" onSubmit={handleSubmit} aria-labelledby="unexpected-expense-title">
      <div className="unexpected-expense-heading"><h2 id="unexpected-expense-title">One-time unexpected expense</h2><Link href="/totals/unexpected-expenses/history" className="unexpected-expense-history-link">History</Link></div>
      <div className="unexpected-expense-fields">
        <label>
          <span>Amount</span>
          <span className="unexpected-amount-input"><span aria-hidden="true">$</span><input required type="number" inputMode="decimal" min="0.01" max="9999999999.99" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></span>
        </label>
        <label>
          <span>Date</span>
          <input required type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
        </label>
        <label className="unexpected-description-field">
          <span>Description</span>
          <input required type="text" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Add"}</button>
      </div>
      {message && <p className={`unexpected-expense-message${hasError ? " is-error" : ""}`} role={hasError ? "alert" : "status"}>{message}</p>}
    </form>
  );
}
