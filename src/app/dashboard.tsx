"use client";

import { SubmitEvent, useState, CSSProperties } from "react";
import { addTransaction, resetTransactions, deleteTransaction, type WeeklyHistory } from "@/app/transactions/actions";
import BottomNav from "./bottom-nav";

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
  initialHistory: WeeklyHistory[];
};

export default function Dashboard({ householdId, weeklyBudget, initialExpenses, initialHistory }: DashboardProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [history, setHistory] = useState<WeeklyHistory[]>(initialHistory);
  const [resetError, setResetError] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const spent = expenses.reduce((total, expense) => total + expense.amount, 0);
  const remaining = weeklyBudget - spent;
  const progress = Math.min(100, Math.max(0, (remaining / weeklyBudget) * 100));
  const progressColor = progress < 25 ? "#ff6257" : progress < 50 ? "#ffd21c" : "#5ee6a8";
  const chartMax = Math.max(1, ...history.map((entry) => Math.max(entry.amount_spent, entry.budget_amount)));
  const chartPoints = history.map((entry, index) => {
    const firstTime = new Date(history[0].reset_at).getTime();
    const lastTime = new Date(history[history.length - 1].reset_at).getTime();
    const time = new Date(entry.reset_at).getTime();
    const elapsed = lastTime > firstTime
      ? (time - firstTime) / (lastTime - firstTime)
      : history.length === 1 ? 0.5 : index / (history.length - 1);
    return {
      ...entry,
      x: 8 + elapsed * 84,
      spendY: 88 - (entry.amount_spent / chartMax) * 72,
      budgetY: 88 - (entry.budget_amount / chartMax) * 72,
    };
  });
  const spendingLine = chartPoints.map((point) => `${point.x},${point.spendY}`).join(" ");
  const budgetLine = chartPoints.map((point) => `${point.x},${point.budgetY}`).join(" ");
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

  setResetError("");
  const result = await resetTransactions();

  if (result.error) {
    setResetError(result.error);
    return;
  }

  if (!result.history) {
    setResetError("Weekly history could not be saved. Your expenses were left unchanged.");
    return;
  }

  setHistory((current) => [...current, result.history!].slice(-8));
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
    <BottomNav />
    <section className="budget-card" aria-labelledby="page-title">
      <header className="monthly-heading weekly-heading">
        <h1 id="page-title">Weekly</h1>
      </header>

      <section className="weekly-history-card" aria-labelledby="weekly-history-title">
        <div className="weekly-history-heading">
          <h2 id="weekly-history-title">Weekly spending</h2>
        </div>
        {history.length === 0 ? (
          <p className="weekly-history-empty">Your spending history will appear here after your first budget reset.</p>
        ) : (
          <>
            <div className="weekly-history-legend" aria-hidden="true">
              <span><i className="weekly-history-spend-key" /> Spending</span>
              <span><i className="weekly-history-budget-key" /> Budget</span>
            </div>
            <div className="totals-chart weekly-history-plot" role="img" aria-label={`Weekly spending history: ${chartPoints.map((point) => `${new Date(point.reset_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, spent $${point.amount_spent.toFixed(2)} against a $${point.budget_amount.toFixed(2)} budget`).join("; ")}`}>
              <div className="totals-chart-y-axis" aria-hidden="true">
                <span>${chartMax.toFixed(0)}</span>
                <span>${(chartMax / 2).toFixed(0)}</span>
                <span>$0</span>
              </div>
              <div className="totals-chart-plot">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <line x1="5" y1="16" x2="95" y2="16" className="totals-chart-axis" />
                  <line x1="5" y1="52" x2="95" y2="52" className="totals-chart-axis" />
                  <line x1="5" y1="88" x2="95" y2="88" className="totals-chart-axis" />
                  <polyline points={budgetLine} className="weekly-chart-budget-line" />
                  <polyline points={spendingLine} className="totals-chart-line" />
                  {chartPoints.map((point) => <circle key={point.id} cx={point.x} cy={point.spendY} r="1.7" className="totals-chart-dot" />)}
                </svg>
              </div>
            </div>
            <div className="totals-chart-dates weekly-chart-dates">
              <span className="totals-chart-date-spacer" aria-hidden="true" />
              <div className="totals-chart-date-axis">
                <span>{new Date(chartPoints[0].reset_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span>{new Date(chartPoints[chartPoints.length - 1].reset_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="weekly-overview" aria-label="Weekly budget progress">
        <div className="balance-section">
          <div className="weekly-balance-copy">
            <p className="weekly-balance-label">Remaining this week</p>
            <p className="balance" aria-live="polite">
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
      </section>

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

      <button className="reset-button" type="button" onClick={resetBudget}>
        Reset weekly budget
      </button>
      {resetError && <p className="weekly-reset-error" role="alert">{resetError}</p>}

    </section>
  </main>
);
}
