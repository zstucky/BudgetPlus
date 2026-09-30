"use client";

import { useState, type FormEvent } from "react";
import { addOutreachIncome, addOutreachSpend, updateOutreachImpact, type OutreachIncome, type OutreachSpend } from "./actions";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function displayDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OutreachDashboard({ initialIncome, initialSpends }: { initialIncome: OutreachIncome[]; initialSpends: OutreachSpend[] }) {
  const [income, setIncome] = useState(initialIncome);
  const [spends, setSpends] = useState(initialSpends);
  const [savingEntry, setSavingEntry] = useState<"income" | "spend" | null>(null);
  const [savingImpactId, setSavingImpactId] = useState<string | null>(null);
  const [impactDrafts, setImpactDrafts] = useState<Record<string, string>>({});
  const [savedImpactId, setSavedImpactId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalIn = income.reduce((sum, entry) => sum + entry.amount, 0);
  const totalOut = spends.reduce((sum, entry) => sum + entry.amount, 0);
  const balance = totalIn - totalOut;
  const activities = [
    ...income.map((entry) => ({ ...entry, kind: "income" as const })),
    ...spends.map((entry) => ({ ...entry, kind: "spend" as const })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const [expandedSpendId, setExpandedSpendId] = useState<string | null>(null);

  async function addEntry(event: FormEvent<HTMLFormElement>, type: "income" | "spend") {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSavingEntry(type);
    setError(null);
    try {
      const input = { amount: Number(form.get("amount")), description: String(form.get("description") ?? "") };
      if (type === "income") {
        const result = await addOutreachIncome(input);
        if (result.error || !result.entry) { setError(result.error ?? "Unable to add money."); return; }
        setIncome((current) => [result.entry!, ...current]);
      } else {
        const result = await addOutreachSpend(input);
        if (result.error || !result.entry) { setError(result.error ?? "Unable to add spend."); return; }
        setSpends((current) => [result.entry!, ...current]);
      }
      formElement.reset();
    } finally { setSavingEntry(null); }
  }

  async function saveImpact(spend: OutreachSpend) {
    setSavingImpactId(spend.id);
    setError(null);
    setSavedImpactId(null);
    try {
      const result = await updateOutreachImpact({ spendId: spend.id, impact: impactDrafts[spend.id] ?? spend.impact ?? "" });
      if (result.error) { setError(result.error); return; }
      setSpends((current) => current.map((entry) => entry.id === spend.id ? { ...entry, impact: result.impact } : entry));
      setImpactDrafts((current) => { const next = { ...current }; delete next[spend.id]; return next; });
      setSavedImpactId(spend.id);
    } finally { setSavingImpactId(null); }
  }

  return (
    <section className="monthly-content outreach-content" aria-labelledby="outreach-title">
      <header className="monthly-heading"><h1 id="outreach-title">Outreach</h1></header>

      <section className="monthly-calendar outreach-balance" aria-labelledby="outreach-balance-title">
        <div className="calendar-heading"><div><p className="totals-kicker">Available outreach fund</p><h2 id="outreach-balance-title" className={balance < 0 ? "outreach-negative" : ""}>{money(balance)}</h2></div></div>
      </section>

      <form className="monthly-form outreach-form" onSubmit={(event) => addEntry(event, "income")}>
        <h2>Add money</h2>
        <div className="outreach-form-fields">
          <div><label htmlFor="income-description">Description</label><input id="income-description" name="description" required maxLength={120} placeholder="Donation, fundraiser…" /></div>
          <div><label htmlFor="income-amount">Amount</label><div className="monthly-amount-input"><span aria-hidden="true">$</span><input id="income-amount" name="amount" required type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" placeholder="0.00" /></div></div>
        </div>
        <button type="submit" disabled={savingEntry !== null}>{savingEntry === "income" ? "Adding…" : "Add money"}</button>
      </form>

      <form className="monthly-form outreach-form" onSubmit={(event) => addEntry(event, "spend")}>
        <h2>Add spend</h2>
        <div className="outreach-form-fields">
          <div><label htmlFor="spend-description">Description</label><input id="spend-description" name="description" required maxLength={120} placeholder="Food pantry supplies…" /></div>
          <div><label htmlFor="spend-amount">Amount</label><div className="monthly-amount-input"><span aria-hidden="true">$</span><input id="spend-amount" name="amount" required type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" placeholder="0.00" /></div></div>
        </div>
        <button type="submit" disabled={savingEntry !== null}>{savingEntry === "spend" ? "Adding…" : "Add spend"}</button>
      </form>

      {error && <p className="monthly-error" role="alert">{error}</p>}

      <section className="monthly-bills outreach-list" aria-labelledby="outreach-activity-title">
        <div className="monthly-list-heading"><h2 id="outreach-activity-title">Outreach activity</h2><span>{activities.length}</span></div>
        {!activities.length ? <p className="monthly-empty">Money added and spends will appear here.</p> : <ul>{activities.map((entry) => {
          const expanded = entry.kind === "spend" && expandedSpendId === entry.id;
          const row = <><span className="bill-details"><strong>{entry.description}</strong><span>{entry.kind === "income" ? "Money added" : "Spend"} · {displayDate(entry.created_at)}</span></span><strong className={`bill-amount outreach-activity-amount${entry.kind === "income" ? " outreach-income-amount" : ""}`}>{entry.kind === "income" ? "+" : "−"}{money(entry.amount)}</strong></>;
          return <li className="outreach-activity-item" key={`${entry.kind}-${entry.id}`}>
            {entry.kind === "spend" ? <button type="button" className="outreach-activity-trigger" aria-expanded={expanded} onClick={() => setExpandedSpendId(expanded ? null : entry.id)}>{row}<span className="totals-chevron" aria-hidden="true">{expanded ? "⌄" : "›"}</span></button> : <div className="outreach-activity-row">{row}<span className="outreach-activity-spacer" aria-hidden="true" /></div>}
            {entry.kind === "spend" && expanded && <div className="outreach-impact-panel">
              <label htmlFor={`spend-impact-${entry.id}`}>Impact</label>
              <textarea id={`spend-impact-${entry.id}`} rows={3} maxLength={5000} placeholder="Describe the impact this spend made…" value={impactDrafts[entry.id] ?? entry.impact ?? ""} onChange={(event) => { setImpactDrafts((current) => ({ ...current, [entry.id]: event.target.value })); setSavedImpactId(null); }} />
              <div className="outreach-impact-actions"><button type="button" className="totals-secondary-button" disabled={savingImpactId !== null} onClick={() => saveImpact(entry)}>{savingImpactId === entry.id ? "Saving…" : "Save impact"}</button>{savedImpactId === entry.id && <span role="status">Saved</span>}</div>
            </div>}
          </li>;
        })}</ul>}
      </section>
    </section>
  );
}
