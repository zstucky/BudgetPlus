"use client";

import { useState } from "react";
import { deleteTransaction } from "@/app/transactions/actions";

type HistoricalTransaction = {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
};

export default function TransactionHistoryList({ initialTransactions }: { initialTransactions: HistoricalTransaction[] }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function removeTransaction(transaction: HistoricalTransaction) {
    const confirmed = window.confirm(`Delete “${transaction.description}” for $${transaction.amount.toFixed(2)}? This cannot be undone.`);
    if (!confirmed) return;

    setError(null);
    setDeletingId(transaction.id);
    try {
      const result = await deleteTransaction(transaction.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTransactions((current) => current.filter((entry) => entry.id !== transaction.id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section className="monthly-bills totals-history-list" aria-label="Inactive transactions">
        {!transactions.length ? (
          <p className="monthly-empty">Transactions from completed weeks will appear here.</p>
        ) : (
          <ul>
            {transactions.map((transaction) => (
              <li key={transaction.id}>
                <div className="bill-details">
                  <strong>{transaction.description}</strong>
                  <span>{formatDate(transaction.transaction_date)}</span>
                </div>
                <strong className="transaction-history-amount">−${transaction.amount.toFixed(2)}</strong>
                <button
                  type="button"
                  className="bill-delete totals-history-delete"
                  aria-label={`Delete ${transaction.description}, $${transaction.amount.toFixed(2)}`}
                  disabled={deletingId === transaction.id}
                  onClick={() => removeTransaction(transaction)}
                >
                  {deletingId === transaction.id ? "…" : "×"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {error && <p className="monthly-error" role="alert">Couldn&apos;t delete transaction: {error}</p>}
    </>
  );
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
