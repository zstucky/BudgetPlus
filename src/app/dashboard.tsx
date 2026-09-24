"use client";

import { SubmitEvent, useState, CSSProperties } from "react";
import { logout } from "@/app/auth/actions";
import { addTransaction, resetTransactions, deleteTransaction } from "@/app/transactions/actions";
import Link from "next/link";

type Expense = {
  id: string;
  amount: number;
  description: string;
  created_at: string;
};

type DashboardProps = {
  householdId: string;
  weeklyBudget: number;
  initialExpenses: Expense[]
};

export default function Dashboard({ householdId, weeklyBudget, initialExpenses }: DashboardProps) {
  console.log("DASHBOARD INITIAL EXPENSES:", initialExpenses);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const spent = expenses.reduce((total, expense) => total + expense.amount, 0);
  const remaining = weeklyBudget - spent;
  const progress = Math.min(100, Math.max(0, (remaining / weeklyBudget) * 100));
  const progressColor = progress <= 20 ? "#ff6257" : progress <= 50 ? "#f4c542" : "#5ee6a8";
  const ringStyle = {
    background: `conic-gradient(${progressColor} ${progress}%, #29333b ${progress}% 100%)`,
  };

  async function subtractExpense(event: SubmitEvent<HTMLFormElement>) {
  event.preventDefault();
  const expense = Number.parseFloat(amount);
  if (!Number.isFinite(expense) || expense <= 0) return;
  const transactionAmount = expense;
  const transactionDescription = description.trim() || "Expense";
  setIsAdding(true);
  try {
    const result = await addTransaction(
      transactionAmount,
      transactionDescription,
    );
    if (result.error) {
      console.error("Failed to add transaction:", result.error);
      return;
    }
    const transaction = result.transaction;
    if (!transaction) {
      console.error("Transaction was created but no data was returned.");
      return;
    }
    setExpenses((current) => [
      transaction,
      ...current,
    ]);
    setAmount("");
    setDescription("");
  } finally {
    setIsAdding(false);
  }
}

async function removeExpense(transactionId: string) {
  const result = await deleteTransaction(transactionId);

  if (result.error) {
    console.error("Failed to delete transaction:", result.error);
    return;
  }

  setExpenses((current) =>
    current.filter((expense) => expense.id !== transactionId),
  );
}

async function resetBudget() {
  const confirmed = window.confirm(
    "Are you sure you want to clear all transactions for your household? This cannot be undone.",
  );

  if (!confirmed) return;

  const result = await resetTransactions();

  if (result.error) {
    console.error("Failed to reset transactions:", result.error);
    return;
  }

  setExpenses([]);
  setAmount("");
  setDescription("");
}

return (
  <main
    className="budget-page"
    style={
      {
        "--accent-color": progressColor,
      } as CSSProperties
    }
  >
    <section className="budget-card" aria-labelledby="page-title">
      <div
        id="page-title"
        className="eyebrow"
        style={{ color: progressColor }}
      >
        Weekly Budget
      </div>

      <div className="balance-section">
        <div>
        <p
          className="balance"
          aria-live="polite"
          style={{ color: progressColor }}
        >
          <span>$</span>
          {remaining.toFixed(2)}
        </p>
        </div>

        <div
          className="progress-wrap"
          aria-label={`${progress.toFixed(0)} percent of weekly budget remaining`}
        >
          <div className="progress-ring" style={ringStyle}>
            <div className="progress-center">
              <strong>{Math.round(progress)}%</strong>
              <span>left</span>
            </div>
          </div>
        </div>
      </div>

      <form className="expense-form" onSubmit={subtractExpense}>
        <label htmlFor="expense">Purchase</label>

        <div className="input-row">
          <div className="amount-input">
            <span aria-hidden="true">$</span>

            <input
              id="expense"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <input
            id="description"
            className="description-input"
            type="text"
            placeholder="Description (Optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          <button
            type="submit"
            disabled={isAdding}
            style={{ backgroundColor: progressColor }}
          >
            {isAdding ? "Saving..." : "Subtract"}
          </button>
        </div>


      </form>

            <div className="expense-summary">
        <div className="spending-summary">
          <span>Spent this week</span>
          <strong>${spent.toFixed(2)}</strong>
        </div>

        {expenses.length > 0 && (
          <ul className="expense-list" aria-label="Expenses added this week">
            {expenses.map((expense) => (
              <li key={expense.id}>
                <span>{expense.description}</span>

                <div className="transaction-actions">
                  <strong>−${expense.amount.toFixed(2)}</strong>

                  <button
                    type="button"
                    className="delete-transaction-button"
                    onClick={() => removeExpense(expense.id)}
                    aria-label={`Delete ${expense.description}`}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        className="reset-button"
        type="button"
        onClick={resetBudget}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 11a8.1 8.1 0 0 0-15.5-2.9L3 10m0-5v5h5" />
          <path d="M4 13a8.1 8.1 0 0 0 15.5 2.9L21 14m0 5v-5h-5" />
        </svg>

        Reset weekly budget
      </button>

      <div className="account-actions">
        <form action={logout}>
          <button className="logout-button" type="submit">
            Log out
          </button>
        </form>
        <Link className="household-button" href="/household">
          Edit household
        </Link>
      </div>
    </section>
  </main>
);
}
