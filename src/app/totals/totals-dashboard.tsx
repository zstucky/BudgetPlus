"use client";

import { useMemo, useState, type FormEvent } from "react";
import { createAccount, deleteAccount, recordTotalSnapshot, updateAccountBalance, type Account, type TotalSnapshot } from "./actions";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function getChartRange(snapshots: TotalSnapshot[]) {
  if (!snapshots.length) return null;
  const values = snapshots.map((point) => point.total);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const rawStep = (dataMax - dataMin) / 2 || Math.max(Math.abs(dataMax) * 0.12, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  const step = (fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10) * magnitude;
  const lowerTick = Math.floor(dataMin / step);
  let upperTick = Math.ceil(dataMax / step);
  if (upperTick - lowerTick < 2) upperTick = lowerTick + 2;
  if ((upperTick - lowerTick) % 2 !== 0) upperTick += 1;
  return { min: lowerTick * step, max: upperTick * step };
}

export default function TotalsDashboard({ initialAccounts, initialSnapshots }: { initialAccounts: Account[]; initialSnapshots: TotalSnapshot[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [selected, setSelected] = useState<Account | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [balanceType, setBalanceType] = useState<"asset" | "liability">("asset");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => accounts.reduce((sum, account) => sum + account.balance * (account.balance_type === "liability" ? -1 : 1), 0), [accounts]);
  const chartRange = useMemo(() => getChartRange(snapshots), [snapshots]);
  const chartPoints = useMemo(() => {
    const history = snapshots;
    if (!history.length || !chartRange) return [];
    const span = chartRange.max - chartRange.min;
    return history.map((point, index) => ({ ...point, x: history.length === 1 ? 50 : 8 + (index / (history.length - 1)) * 84, y: 88 - ((point.total - chartRange.min) / span) * 72 }));
  }, [snapshots, chartRange]);

  function openAccount(account: Account) {
    setSelected(account);
    setConfirmDelete(false);
    setAmount(account.balance.toFixed(2));
    setError(null);
  }

  async function saveBalance(updateMode: "add" | "replace") {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateAccountBalance({ accountId: selected.id, amount: Number(amount), mode: updateMode });
      if (result.error || !result.data) { setError(result.error ?? "Unable to update account."); return; }
      setAccounts((current) => current.map((account) => account.id === result.data!.id ? result.data! : account));
      setSelected(null);
    } finally { setSaving(false); }
  }

  async function removeAccount() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const result = await deleteAccount(selected.id);
      if (result.error) { setError(result.error); return; }
      setAccounts((current) => current.filter((account) => account.id !== selected.id));
      setSelected(null);
      setConfirmDelete(false);
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
      setSnapshots((current) => [...current, result.data!].slice(-15));
    } finally { setSaving(false); }
  }

  const line = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="monthly-content totals-content" aria-labelledby="totals-title">
      <header className="monthly-heading"><h1 id="totals-title">Totals</h1></header>
      <section className="monthly-calendar totals-chart-card" aria-labelledby="net-worth-title">
        <div className="calendar-heading"><div><p className="totals-kicker">Your net worth</p><h2 id="net-worth-title">{money(total)}</h2></div><span className="totals-chart-label">History</span></div>
        <div className="totals-chart" role="img" aria-label={chartPoints.length ? `Net worth over time: ${chartPoints.map((point) => `${new Date(point.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${money(point.total)}`).join(", ")}` : "No saved balance history yet"}>
          {chartPoints.length && chartRange ? <><div className="totals-chart-y-axis" aria-hidden="true"><span>{money(chartRange.max)}</span><span>{money((chartRange.max + chartRange.min) / 2)}</span><span>{money(chartRange.min)}</span></div><div className="totals-chart-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="5" y1="16" x2="95" y2="16" className="totals-chart-axis"/><line x1="5" y1="52" x2="95" y2="52" className="totals-chart-axis"/><line x1="5" y1="88" x2="95" y2="88" className="totals-chart-axis"/><polyline points={line} className="totals-chart-line"/>{chartPoints.map((point, index) => <circle key={point.id ?? index} cx={point.x} cy={point.y} r="1.7" className="totals-chart-dot" />)}</svg></div></> : <p>Record your first total to start tracking your progress.</p>}
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
      {selected && <div className="totals-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelected(null); setConfirmDelete(false); } }}><section className={`totals-modal${confirmDelete ? "" : " totals-modal-delete-ready"}`} role="dialog" aria-modal="true" aria-labelledby="update-account-title"><button className="totals-modal-close" type="button" aria-label="Close" onClick={() => { setSelected(null); setConfirmDelete(false); }}>×</button><h2 id="update-account-title">{selected.name}</h2><p>Current balance: <strong>{money(selected.balance)}</strong></p><div className="totals-form"><label htmlFor="balance-amount">Amount</label><div className="monthly-amount-input"><span>$</span><input id="balance-amount" autoFocus type="number" min="0" max="9999999999.99" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><div className="totals-update-actions"><button type="button" className="totals-primary-button" disabled={saving || amount === ""} onClick={() => saveBalance("add")}>{saving ? "Saving…" : "Add"}</button><button type="button" className="totals-secondary-button" disabled={saving || amount === ""} onClick={() => saveBalance("replace")}>{saving ? "Saving…" : "Replace"}</button></div><div className="totals-delete-area">{confirmDelete ? <><p>Delete <strong>{selected.name}</strong>? This can&apos;t be undone.</p><div className="totals-delete-actions"><button type="button" className="totals-delete-cancel" disabled={saving} onClick={() => setConfirmDelete(false)}>Cancel</button><button type="button" className="totals-delete-confirm" disabled={saving} onClick={removeAccount}>{saving ? "Deleting…" : "Confirm delete"}</button></div></> : <button type="button" className="totals-delete-trigger" disabled={saving} onClick={() => { setConfirmDelete(true); setError(null); }}>Delete account</button>}</div>{error && <p className="monthly-error" role="alert">{error}</p>}</div></section></div>}
    </section>
  );
}
