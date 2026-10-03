"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createAccount, deleteAccount, recordTotalSnapshot, updateAccountBalance, type Account, type TotalSnapshot } from "./actions";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function getChartRange(values: number[]) {
  if (!values.length) return null;
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

function addMonthsClamped(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()));
}

function getXPosition(value: string, fallback: number, startTime: number, timeSpan: number) {
  const timestamp = new Date(value).getTime();
  const elapsed = timeSpan > 0 ? (timestamp - startTime) / timeSpan : fallback;
  return 8 + Math.min(1, Math.max(0, elapsed)) * 84;
}

export default function TotalsDashboard({ initialAccounts, initialSnapshots, outreachLiability, monthlyProjection, forecastStartDate }: { initialAccounts: Account[]; initialSnapshots: TotalSnapshot[]; outreachLiability: number; monthlyProjection: number | null; forecastStartDate: string }) {
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

  const outreachAccount: Account = { id: "outreach-fund", name: "Outreach", balance: outreachLiability, balance_type: "liability" };
  const displayAccounts = [...accounts, outreachAccount];
  const total = useMemo(() => accounts.reduce((sum, account) => sum + account.balance * (account.balance_type === "liability" ? -1 : 1), 0) - outreachLiability, [accounts, outreachLiability]);
  const forecastPoints = useMemo(() => {
    if (monthlyProjection === null) return [];
    const oldestVisibleSnapshot = snapshots[0];
    const start = new Date(oldestVisibleSnapshot?.created_at ?? forecastStartDate);
    const startingTotal = oldestVisibleSnapshot?.total ?? total;
    return Array.from({ length: 7 }, (_, index) => ({
      id: `forecast-${index}`,
      total: startingTotal + monthlyProjection * index,
      created_at: addMonthsClamped(start, index).toISOString(),
    }));
  }, [monthlyProjection, forecastStartDate, snapshots, total]);
  const chartRange = useMemo(() => getChartRange([
    ...snapshots.map((point) => point.total),
    ...forecastPoints.map((point) => point.total),
  ]), [snapshots, forecastPoints]);
  const chartStartTime = snapshots.length
    ? new Date(snapshots[0].created_at).getTime()
    : forecastPoints.length ? new Date(forecastPoints[0].created_at).getTime() : 0;
  const chartEndTime = forecastPoints.length
    ? new Date(forecastPoints[forecastPoints.length - 1].created_at).getTime()
    : snapshots.length ? new Date(snapshots[snapshots.length - 1].created_at).getTime() : 0;
  const chartTimeSpan = chartEndTime - chartStartTime;
  const chartPoints = useMemo(() => {
    const history = snapshots;
    if (!history.length || !chartRange) return [];
    const span = chartRange.max - chartRange.min;
    return history.map((point, index) => {
      const fallback = history.length === 1 ? 0.5 : index / (history.length - 1);
      return { ...point, x: getXPosition(point.created_at, fallback, chartStartTime, chartTimeSpan), y: 88 - ((point.total - chartRange.min) / span) * 72 };
    });
  }, [snapshots, chartRange, chartTimeSpan, chartStartTime]);
  const forecastChartPoints = useMemo(() => {
    if (!forecastPoints.length || !chartRange) return [];
    const span = chartRange.max - chartRange.min;
    return forecastPoints.map((point, index) => ({
      ...point,
      x: getXPosition(point.created_at, index / (forecastPoints.length - 1), chartStartTime, chartTimeSpan),
      y: 88 - ((point.total - chartRange.min) / span) * 72,
    }));
  }, [forecastPoints, chartRange, chartTimeSpan, chartStartTime]);

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
  const forecastLine = forecastChartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const chartHasPoints = chartPoints.length > 0 || forecastChartPoints.length > 0;

  return (
    <section className="monthly-content totals-content" aria-labelledby="totals-title">
      <header className="monthly-heading"><h1 id="totals-title">Totals</h1></header>
      <section className="monthly-calendar totals-chart-card" aria-labelledby="net-worth-title">
        <div className="calendar-heading"><div><p className="totals-kicker">Your net worth</p><h2 id="net-worth-title">{money(total)}</h2></div><Link href="/totals/history" className="totals-chart-label">History</Link></div>
        {forecastChartPoints.length > 0 && <div className="totals-chart-legend" aria-hidden="true"><span><i className="totals-chart-history-key" />History</span><span><i className="totals-chart-forecast-key" />Prediction</span></div>}
        <div className="totals-chart" role="img" aria-label={chartHasPoints ? `${chartPoints.length ? `Net worth history: ${chartPoints.map((point) => `${new Date(point.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${money(point.total)}`).join(", ")}. ` : ""}${forecastChartPoints.length ? `Six month prediction: ${forecastChartPoints.slice(1).map((point) => `${new Date(point.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${money(point.total)}`).join(", ")}` : ""}` : "No saved balance history yet"}>
          {chartHasPoints && chartRange ? <><div className="totals-chart-y-axis" aria-hidden="true"><span>{money(chartRange.max)}</span><span>{money((chartRange.max + chartRange.min) / 2)}</span><span>{money(chartRange.min)}</span></div><div className="totals-chart-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="5" y1="16" x2="95" y2="16" className="totals-chart-axis"/><line x1="5" y1="52" x2="95" y2="52" className="totals-chart-axis"/><line x1="5" y1="88" x2="95" y2="88" className="totals-chart-axis"/>{chartPoints.length > 0 && <><polyline points={line} className="totals-chart-line"/>{chartPoints.map((point, index) => <circle key={point.id ?? index} cx={point.x} cy={point.y} r="1.7" className="totals-chart-dot" />)}</>}{forecastChartPoints.length > 0 && <><polyline points={forecastLine} className="totals-chart-forecast-line"/>{forecastChartPoints.map((point) => <circle key={point.id} cx={point.x} cy={point.y} r="1.4" className="totals-chart-forecast-dot" />)}</>}</svg></div></> : <p>Record your first total to start tracking your progress.</p>}
        </div>
        <div className="totals-chart-dates">
          <span className="totals-chart-date-spacer" aria-hidden="true" />
          {chartHasPoints && <div className="totals-chart-date-axis"><span>{new Date(chartPoints[0]?.created_at ?? forecastChartPoints[0].created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span><span>{new Date(forecastChartPoints[forecastChartPoints.length - 1]?.created_at ?? chartPoints[chartPoints.length - 1].created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>}
        </div>
      </section>

      <section className="monthly-bills totals-accounts" aria-labelledby="accounts-title">
        <div className="monthly-list-heading"><h2 id="accounts-title">Accounts</h2><span>{displayAccounts.length}</span></div>
        <div className="monthly-total-row"><span>Current total</span><strong className={total < 0 ? "totals-negative" : ""}>{money(total)}</strong></div>
        <ul>{accounts.map((account) => <li key={account.id}><button type="button" className="totals-account-button" onClick={() => openAccount(account)} aria-label={`Update ${account.name}, current balance ${money(account.balance)}`}><span className={`totals-sign${account.balance_type === "liability" ? " totals-sign-debt" : ""}`}>{account.balance_type === "asset" ? "+" : "−"}</span><span className="bill-details"><strong>{account.name}</strong><span>{account.balance_type === "asset" ? "Adds to your total" : "Subtracts from your total"}</span></span><strong className="bill-amount">{money(account.balance)}</strong><span className="totals-chevron" aria-hidden="true">›</span></button></li>)}
          <li className="totals-auto-account-row"><div className="totals-account-button totals-auto-account"><span className="totals-sign totals-sign-debt" aria-hidden="true">−</span><span className="bill-details"><strong>Outreach</strong><span>Calculated from outreach activity</span></span><strong className="bill-amount">{money(outreachAccount.balance)}</strong><span className="totals-auto-label">Auto</span></div></li>
        </ul>
        <button type="button" className="totals-add-account" onClick={() => { setShowAdd((current) => !current); setError(null); }}>{showAdd ? "− Cancel" : "+ Add account"}</button>
        {showAdd && <form className="totals-form" onSubmit={addNewAccount}><label htmlFor="account-name">Account name</label><input id="account-name" required maxLength={100} placeholder="Checking, credit card..." value={name} onChange={(event) => setName(event.target.value)} /><div className="totals-form-grid"><div><label htmlFor="account-type">Counts as</label><select id="account-type" value={balanceType} onChange={(event) => setBalanceType(event.target.value as "asset" | "liability")}><option value="asset">An asset (+)</option><option value="liability">A debt (−)</option></select></div><div><label htmlFor="initial-balance">Starting balance</label><div className="monthly-amount-input"><span>$</span><input id="initial-balance" name="initial-balance" required type="number" min="0" max="9999999999.99" step="0.01" placeholder="0.00" /></div></div></div><button type="submit" className="totals-primary-button" disabled={saving}>{saving ? "Saving…" : "Add account"}</button></form>}
      </section>
      <button type="button" className="totals-snapshot-button" disabled={saving} onClick={addSnapshot}><span aria-hidden="true">⌁</span>{saving ? "Saving…" : "Record today’s total"}</button>
      {error && !selected && <p className="monthly-error" role="alert">{error}</p>}
      {selected && <div className="totals-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelected(null); setConfirmDelete(false); } }}><section className={`totals-modal${confirmDelete ? "" : " totals-modal-delete-ready"}`} role="dialog" aria-modal="true" aria-labelledby="update-account-title"><button className="totals-modal-close" type="button" aria-label="Close" onClick={() => { setSelected(null); setConfirmDelete(false); }}>×</button><h2 id="update-account-title">{selected.name}</h2><p>Current balance: <strong>{money(selected.balance)}</strong></p><div className="totals-form"><label htmlFor="balance-amount">Amount</label><div className="monthly-amount-input"><span>$</span><input id="balance-amount" autoFocus type="number" min="0" max="9999999999.99" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><div className="totals-update-actions"><button type="button" className="totals-primary-button" disabled={saving || amount === ""} onClick={() => saveBalance("add")}>{saving ? "Saving…" : "Add"}</button><button type="button" className="totals-secondary-button" disabled={saving || amount === ""} onClick={() => saveBalance("replace")}>{saving ? "Saving…" : "Replace"}</button></div><div className="totals-delete-area">{confirmDelete ? <><p>Delete <strong>{selected.name}</strong>? This can&apos;t be undone.</p><div className="totals-delete-actions"><button type="button" className="totals-delete-cancel" disabled={saving} onClick={() => setConfirmDelete(false)}>Cancel</button><button type="button" className="totals-delete-confirm" disabled={saving} onClick={removeAccount}>{saving ? "Deleting…" : "Confirm delete"}</button></div></> : <button type="button" className="totals-delete-trigger" disabled={saving} onClick={() => { setConfirmDelete(true); setError(null); }}>Delete account</button>}</div>{error && <p className="monthly-error" role="alert">{error}</p>}</div></section></div>}
    </section>
  );
}
