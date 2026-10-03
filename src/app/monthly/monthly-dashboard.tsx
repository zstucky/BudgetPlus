"use client";

import { useState, type FormEvent } from "react";
import { addMonthlyReminder, addRecurringBill, deleteMonthlyReminder, deleteRecurringBill } from "./actions";
import MonthlyCalendar from "./monthly-calendar";

export type RecurringBill = {
  id: string;
  name: string;
  amount: number;
  due_day: number;
};

export type MonthlyReminder = {
  id: string;
  description: string;
  reminder_date: string;
};

export default function MonthlyDashboard({ initialBills, initialReminders }: { initialBills: RecurringBill[]; initialReminders: MonthlyReminder[] }) {
  const [bills, setBills] = useState(initialBills);
  const [reminders, setReminders] = useState(initialReminders);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reminderDescription, setReminderDescription] = useState("");
  const [reminderDay, setReminderDay] = useState("1");
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);
  const monthlyTotal = bills.reduce((total, bill) => total + bill.amount, 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const result = await addRecurringBill({ name, amount: Number(amount), dueDay: Number(dueDay) });
      if (result.error || !result.bill) {
        setError(result.error ?? "Unable to add recurring expense.");
        return;
      }
      setBills((current) => [...current, result.bill!].sort((a, b) => a.due_day - b.due_day));
      setName("");
      setAmount("");
      setDueDay("1");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(billId: string) {
    setError(null);
    setDeletingId(billId);
    try {
      const result = await deleteRecurringBill(billId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBills((current) => current.filter((bill) => bill.id !== billId));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReminderError(null);
    setIsSavingReminder(true);
    try {
      const result = await addMonthlyReminder({ description: reminderDescription, reminderDay: Number(reminderDay) });
      if (result.error || !result.reminder) {
        setReminderError(result.error ?? "Unable to add reminder.");
        return;
      }
      setReminders((current) => [...current, result.reminder!].sort((a, b) => a.reminder_date.localeCompare(b.reminder_date)));
      setReminderDescription("");
      setReminderDay("1");
    } finally {
      setIsSavingReminder(false);
    }
  }

  async function handleDeleteReminder(reminderId: string) {
    setReminderError(null);
    setDeletingReminderId(reminderId);
    try {
      const result = await deleteMonthlyReminder(reminderId);
      if (result.error) {
        setReminderError(result.error);
        return;
      }
      setReminders((current) => current.filter((reminder) => reminder.id !== reminderId));
    } finally {
      setDeletingReminderId(null);
    }
  }

  return (
    <section className="monthly-content" aria-labelledby="monthly-title">
      <header className="monthly-heading">
        <h1 id="monthly-title">Monthly</h1>
      </header>

      <MonthlyCalendar bills={bills} reminders={reminders} />

      <section className="monthly-bills" aria-labelledby="bills-title">
        <div className="monthly-list-heading">
          <h2 id="bills-title">Recurring bills</h2>
          <span>{bills.length}</span>
        </div>
        <div className="monthly-total-row">
          <span>Monthly expenses total</span>
          <strong>${monthlyTotal.toFixed(2)}</strong>
        </div>
        {bills.length === 0 ? (
          <p className="monthly-empty">Your recurring expenses will appear here.</p>
        ) : (
          <ul>
            {bills.map((bill) => (
              <li key={bill.id}>
                <div className="bill-details">
                  <strong>{bill.name}</strong>
                  <span>Due on day {bill.due_day}</span>
                </div>
                <strong className="bill-amount">${bill.amount.toFixed(2)}</strong>
                <button
                  type="button"
                  className="bill-delete"
                  aria-label={`Delete ${bill.name}`}
                  disabled={deletingId === bill.id}
                  onClick={() => handleDelete(bill.id)}
                >
                  {deletingId === bill.id ? "…" : "×"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form className="monthly-form" onSubmit={handleSubmit}>
        <h2>Add an expense</h2>
        <div className="monthly-form-fields">
          <div>
            <label htmlFor="bill-name">Name</label>
            <input
              id="bill-name"
              required
              maxLength={100}
              placeholder="Rent, etc..."
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="bill-amount">Amount</label>
            <div className="monthly-amount-input">
              <span aria-hidden="true">$</span>
              <input
                id="bill-amount"
                required
                type="number"
                inputMode="decimal"
                min="0.01"
                max="99999999.99"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="bill-due-day">Due day</label>
            <select id="bill-due-day" value={dueDay} onChange={(event) => setDueDay(event.target.value)}>
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={isSaving}>{isSaving ? "Adding..." : "Add expense"}</button>
        {error && <p className="monthly-error" role="alert">{error}</p>}
      </form>

      <section className="monthly-bills monthly-reminders-list" aria-labelledby="reminders-title">
        <div className="monthly-list-heading">
          <h2 id="reminders-title">Reminders</h2>
          <span>{reminders.length}</span>
        </div>
        {reminders.length === 0 ? (
          <p className="monthly-empty">Your monthly reminders will appear here.</p>
        ) : (
          <ul>
            {reminders.map((reminder) => {
              const dueDay = Number(reminder.reminder_date.slice(-2));
              return (
                <li key={reminder.id}>
                  <div className="bill-details">
                    <strong>{reminder.description}</strong>
                    <span>Due on day {dueDay}</span>
                  </div>
                  <span className="monthly-reminder-indicator" aria-hidden="true" />
                  <button
                    type="button"
                    className="bill-delete"
                    aria-label={`Delete ${reminder.description}`}
                    disabled={deletingReminderId === reminder.id}
                    onClick={() => handleDeleteReminder(reminder.id)}
                  >
                    {deletingReminderId === reminder.id ? "…" : "×"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form className="monthly-form monthly-reminder-form" onSubmit={handleAddReminder}>
        <h2>Add a reminder</h2>
        <div className="monthly-reminder-fields">
          <div>
            <label htmlFor="reminder-description">Description</label>
            <input
              id="reminder-description"
              required
              maxLength={120}
              placeholder="Credit card due..."
              value={reminderDescription}
              onChange={(event) => setReminderDescription(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="reminder-due-day">Due day</label>
            <select id="reminder-due-day" value={reminderDay} onChange={(event) => setReminderDay(event.target.value)}>
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={isSavingReminder}>{isSavingReminder ? "Adding..." : "Add reminder"}</button>
        {reminderError && <p className="monthly-error" role="alert">{reminderError}</p>}
      </form>
    </section>
  );
}
