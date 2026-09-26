"use client";

import { useMemo, useState, type FormEvent } from "react";
import { createAccount, recordTotalSnapshot, updateAccountBalance, type Account, type TotalSnapshot } from "./actions";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function TotalsDashboard({ initialAccounts, initialSnapshots }: { initialAccounts: Account[]; initialSnapshots: TotalSnapshot[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [selected, setSelected] = useState<Account | null>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"add" | "replace">("add");
  const [name, setName] = useState("");
  const [balanceType, setBalanceType] = useState<"asset" | "liability">("asset");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => accounts.reduce((sum, account) => sum + account.balance * (account.balance_type === "liability" ? -1 : 1), 0), [accounts]);
  const chartPoints = useMemo(() => {
    const history = snapshots.slice(-12);
    if (!history.length) return [];
    const values = history.map((point) => point.total);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const span = max - min || 1;
    return history.map((point, index) => ({ ...point, x: history.length === 1 ? 50 : 8 + (index / (history.length - 1)) * 84, y: 88 - ((point.total - min) / span) * 72 }));
  }, [snapshots]);

  function openAccount(account: Account) {
    setSelected(account);
    setAmount(account.balance.toFixed(2));
    setMode("add");
    setError(null);
  }

  async function saveBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateAccountBalance({ accountId: selected.id, amount: Number(amount), mode });
      if (result.error || !result.data) { setError(result.error ?? "Unable to update account."); return; }
      setAccounts((current) => current.map((account) => account.id === result.data!.id ? result.data! : account));
      setSelected(null);
    } finally { setSaving(false); }
  }

  async function addNewAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const result = await createAccount({ name, balance: Number(formData.get("initial-balance")), balanceType });
      if (result.error || !result.data) { setError(result.error ?? "Unable to add account."); return; }
      setAccounts((current) => [...current, result.data!]);
      setName("");
      setBalanceType("asset");
      setShowAdd(false);
    } finally { setSaving(false); }
  }

  async function addSnapshot() {
    setSaving(true);
    setError(null);
    try {
      const result = await recordTotalSnapshot();
      if (result.error || !result.data) { setError(result.error ?? "Unable to record total."); return; }
      setSnapshots((current) => [...current, result.data!]);
    } finally { setSaving(false); }
  }

  const line = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="monthly-content totals-content" aria-labelledby="totals-title">
      <header className="monthly-heading"><h1 id="totals-title">Totals</h1></header>
      <section className="monthly-calendar totals-chart-card" aria-labelledby="net-worth-title">
        <div className="calendar-heading"><div><p className="totals-kicker">Your net worth</p><h2 id="net-worth-title">{money(total)}</h2></div><span className="totals-chart-label">History</span></div>
        <div className="totals-chart" role="img" aria-label={chartPoints.length ? `Net worth over time: ${chartPoints.map((point) => `${new Date(point.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${money(point.total)}`).join(", ")}` : "No saved balance history yet"}>
          {chartPoints.length ? <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="5" y1="88" x2="95" y2="88" className="totals-chart-axis"/><polyline points={line} className="totals-chart-line"/>{chartPoints.map((point, index) => <circle key={point.id ?? index} cx={point.x} cy={point.y} r="1.7" className="totals-chart-dot" />)}</svg> : <p>Record your first total to start tracking your progress.</p>}
        </div>
        <div className="totals-chart-dates">{chartPoints.length > 0 && <><span>{new Date(chartPoints[0].created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span><span>{new Date(chartPoints[chartPoints.length - 1].created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></>}</div>
      </section>

      <section className="monthly-bills totals-accounts" aria-labelledby="accounts-title">
        <div className="monthly-list-heading"><h2 id="accounts-title">Accounts</h2><span>{accounts.length}</span></div>
        <div className="monthly-total-row"><span>Current total</span><strong className={total < 0 ? "totals-negative" : ""}>{money(total)}</strong></div>
        {accounts.length ? <ul>{accounts.map((account) => <li key={account.id}><button type="button" className="totals-account-button" onClick={() => openAccount(account)} aria-label={`Update ${account.name}, current balance ${money(account.balance)}`}><span className={`totals-sign${account.balance_type === "liability" ? " totals-sign-debt" : ""}`}>{account.balance_type === "asset" ? "+" : "−"}</span><span className="bill-details"><strong>{account.name}</strong><span>{account.balance_type === "asset" ? "Adds to your total" : "Subtracts from your total"}</span></span><strong className="bill-amount">{money(account.balance)}</strong><span className="totals-chevron" aria-hidden="true">›</span></button></li>)}</ul> : <p className="monthly-empty">Add your first account to see your total.</p>}
        <button type="button" className="totals-add-account" onClick={() => { setShowAdd((current) => !current); setError(null); }}>{showAdd ? "− Cancel" : "+ Add account"}</button>
        {showAdd && <form className="totals-form" onSubmit={addNewAccount}><label htmlFor="account-name">Account name</label><input id="account-name" required maxLength={100} placeholder="Checking, credit card..." value={name} onChange={(event) => setName(event.target.value)} /><div className="totals-form-grid"><div><label htmlFor="account-type">Counts as</label><select id="account-type" value={balanceType} onChange={(event) => setBalanceType(event.target.value as "asset" | "liability")}><option value="asset">An asset (+)</option><option value="liability">A debt (−)</option></select></div><div><label htmlFor="initial-balance">Starting balance</label><div className="monthly-amount-input"><span>$</span><input id="initial-balance" name="initial-balance" required type="number" min="0" max="9999999999.99" step="0.01" placeholder="0.00" /></div></div></div><button type="submit" className="totals-primary-button" disabled={saving}>{saving ? "Saving…" : "Add account"}</button></form>}
      </section>
      <button type="button" className="totals-snapshot-button" disabled={saving || accounts.length === 0} onClick={addSnapshot}><span aria-hidden="true">⌁</span>{saving ? "Saving…" : "Record today’s total"}</button>
      {error && !selected && <p className="monthly-error" role="alert">{error}</p>}
      {selected && <div className="totals-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="totals-modal" role="dialog" aria-modal="true" aria-labelledby="update-account-title"><button className="totals-modal-close" type="button" aria-label="Close" onClick={() => setSelected(null)}>×</button><h2 id="update-account-title">{selected.name}</h2><p>Current balance: <strong>{money(selected.balance)}</strong></p><form className="totals-form" onSubmit={saveBalance}><label htmlFor="balance-mode">Update method</label><select id="balance-mode" value={mode} onChange={(event) => setMode(event.target.value as "add" | "replace")}><option value="add">Add an amount</option><option value="replace">Replace current balance</option></select><label htmlFor="balance-amount">{mode === "add" ? "Amount to add" : "New balance"}</label><div className="monthly-amount-input"><span>$</span><input id="balance-amount" required autoFocus type="number" min="0" max="9999999999.99" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><button type="submit" className="totals-primary-button" disabled={saving}>{saving ? "Saving…" : "Save balance"}</button>{error && <p className="monthly-error" role="alert">{error}</p>}</form></section></div>}
    </section>
  );
}
