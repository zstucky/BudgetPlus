"use client";

import { SubmitEvent, useState } from "react";
import { logout } from "@/app/auth/actions";

type Expense = {
  id: string;
  amount: number;
  description: string;
};

type DashboardProps = {
  householdId: string;
  weeklyBudget: number;
};

export default function Dashboard({ householdId, weeklyBudget }: DashboardProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const spent = expenses.reduce((total, expense) => total + expense.amount, 0);
  const remaining = Math.max(0, weeklyBudget - spent);
  const progress = Math.min(100, Math.max(0, (remaining / weeklyBudget) * 100));
  const progressColor = progress <= 20 ? "#ff6257" : progress <= 50 ? "#f4c542" : "#5ee6a8";
  const ringStyle = {
    background: `conic-gradient(${progressColor} ${progress}%, #29333b ${progress}% 100%)`,
  };

  function subtractExpense(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const expense = Number.parseFloat(amount);

    if (!Number.isFinite(expense) || expense <= 0 || remaining <= 0) return;

    setExpenses((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        amount: Math.min(expense, remaining),
        description: description.trim() || "Expense",
      },
      ...current,
    ]);
    setAmount("");
    setDescription("");
  }

  function resetBudget() {
    setExpenses([]);
    setAmount("");
    setDescription("");
  }

  return (
    <main className="budget-page">
      <section className="budget-card" aria-labelledby="page-title">
        <div id="page-title" className="eyebrow">Weekly Budget</div>

        <div className="balance-section">
          <div>
            <p className="balance-label">Available to spend</p>
            <p className="balance" aria-live="polite"><span>$</span>{remaining.toFixed(2)}</p>
          </div>
          <div className="progress-wrap" aria-label={`${progress.toFixed(0)} percent of weekly budget remaining`}>
            <div className="progress-ring" style={ringStyle}>
              <div className="progress-center"><strong>{Math.round(progress)}%</strong><span>left</span></div>
            </div>
          </div>
        </div>

        <div className="expense-summary">
          <div className="spending-summary"><span>Spent this week</span><strong>${spent.toFixed(2)}</strong></div>
          {expenses.length > 0 && (
            <ul className="expense-list" aria-label="Expenses added this week">
              {expenses.map((expense) => <li key={expense.id}><span>{expense.description}</span><strong>−${expense.amount.toFixed(2)}</strong></li>)}
            </ul>
          )}
        </div>

        <form className="expense-form" onSubmit={subtractExpense}>
          <label htmlFor="expense">Amount</label>
          <div className="input-row">
            <div className="amount-input"><span aria-hidden="true">$</span><input id="expense" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
            <button type="submit">Subtract</button>
          </div>
          <label htmlFor="description">Description <span className="optional">(optional)</span></label>
          <input id="description" className="description-input" type="text" placeholder="Coffee, groceries, etc." value={description} onChange={(event) => setDescription(event.target.value)} />
        </form>

        <button className="reset-button" type="button" onClick={resetBudget}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2.9L3 10m0-5v5h5" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2.9L21 14m0 5v-5h-5" /></svg>
          Reset weekly budget
        </button>
        <form action={logout}><button className="logout-button" type="submit">Log out</button></form>
      </section>
    </main>
  );
}
