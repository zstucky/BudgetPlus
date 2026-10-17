"use client";

import { useState } from "react";
import { deleteUnexpectedExpense, type UnexpectedExpense } from "@/app/transactions/actions";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function displayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UnexpectedExpenseHistoryList({ initialExpenses }: { initialExpenses: UnexpectedExpense[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function removeExpense(expense: UnexpectedExpense) {
    const confirmed = window.confirm(`Delete “${expense.description}” for ${money(expense.amount)} on ${displayDate(expense.expense_date)}? This cannot be undone.`);
    if (!confirmed) return;

    setError(null);
    setDeletingId(expense.id);
    try {
      const result = await deleteUnexpectedExpense(expense.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setExpenses((current) => current.filter((entry) => entry.id !== expense.id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section className="monthly-bills totals-history-list" aria-label="Unexpected expense history">
        <div className="monthly-list-heading"><h2>One-time expenses</h2><span>{expenses.length}</span></div>
        {expenses.length === 0 ? (
          <p className="monthly-empty">Unexpected expenses you add will appear here.</p>
        ) : (
          <ul>{expenses.map((expense) => (
            <li key={expense.id}>
              <div className="bill-details">
                <strong><time dateTime={expense.expense_date}>{displayDate(expense.expense_date)}</time></strong>
                <span>{expense.description}</span>
              </div>
              <strong className="bill-amount">{money(expense.amount)}</strong>
              <button type="button" className="bill-delete totals-history-delete" aria-label={`Delete ${expense.description}, ${money(expense.amount)}`} disabled={deletingId === expense.id} onClick={() => removeExpense(expense)}>
                {deletingId === expense.id ? "…" : "×"}
              </button>
            </li>
          ))}</ul>
        )}
      </section>
      {error && <p className="monthly-error" role="alert">{error}</p>}
    </>
  );
}
