"use client";

import { useState } from "react";
import type { MonthlyReminder, RecurringBill } from "./monthly-dashboard";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthlyCalendar({ bills, reminders }: { bills: RecurringBill[]; reminders: MonthlyReminder[] }) {
  const [viewedMonth, setViewedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const firstWeekday = new Date(viewedMonth.year, viewedMonth.month, 1).getDay();
  const daysInMonth = new Date(viewedMonth.year, viewedMonth.month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === viewedMonth.year && today.getMonth() === viewedMonth.month;
  const monthLabel = new Date(viewedMonth.year, viewedMonth.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const totalsByDay = new Map<number, number>();
  const manualBillDays = new Set<number>();
  const remindersByDay = new Map<number, MonthlyReminder[]>();

  for (const bill of bills) {
    totalsByDay.set(bill.due_day, (totalsByDay.get(bill.due_day) ?? 0) + bill.amount);
    if (!bill.is_autopay) manualBillDays.add(bill.due_day);
  }

  for (const reminder of reminders) {
    const day = Number(reminder.reminder_date.slice(-2));
    const dayReminders = remindersByDay.get(day) ?? [];
    dayReminders.push(reminder);
    remindersByDay.set(day, dayReminders);
  }

  function changeMonth(amount: number) {
    setSelectedDay(null);
    setViewedMonth((current) => {
      const next = new Date(current.year, current.month + amount, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  const selectedBills = selectedDay === null ? [] : bills.filter((bill) => bill.due_day === selectedDay);
  const selectedReminders = selectedDay === null ? [] : remindersByDay.get(selectedDay) ?? [];
  const selectedDate = selectedDay === null ? null : new Date(viewedMonth.year, viewedMonth.month, selectedDay);
  const selectedDateLabel = selectedDate?.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="monthly-calendar" aria-label="Monthly bills and reminders calendar">
      <header className="calendar-heading">
        <h2>{monthLabel}</h2>
        <div className="calendar-controls">
          <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>‹</button>
          <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>›</button>
        </div>
      </header>
      <div className="calendar-grid" role="grid" aria-label={monthLabel}>
        {weekdays.map((weekday) => (
          <div className="calendar-weekday" role="columnheader" key={weekday}>{weekday}</div>
        ))}
        {Array.from({ length: firstWeekday }, (_, index) => (
          <div className="calendar-day calendar-day-empty" role="gridcell" aria-hidden="true" key={`empty-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const dueAmount = totalsByDay.get(day) ?? 0;
          const hasManualBill = manualBillDays.has(day);
          const hasAutopayOnly = dueAmount > 0 && !hasManualBill;
          const dayReminders = remindersByDay.get(day) ?? [];
          const isToday = isCurrentMonth && today.getDate() === day;
          const accessibleParts = [
            dueAmount > 0 ? `$${dueAmount.toFixed(2)} in ${hasManualBill ? "bills due" : "autopay bills"}` : "no bills due",
            ...(dayReminders.length ? ["monthly reminder due"] : []),
          ];
          const accessibleLabel = `${monthLabel} ${day}: ${accessibleParts.join(", ")}`;

          return (
            <button
              type="button"
              className={`calendar-day${isToday ? " calendar-day-today" : ""}${hasManualBill ? " calendar-day-due" : ""}${hasAutopayOnly ? " calendar-day-autopay" : ""}${dayReminders.length > 0 ? " calendar-day-reminder" : ""}`}
              role="gridcell"
              aria-label={accessibleLabel}
              aria-pressed={selectedDay === day}
              aria-controls={selectedDay === day ? "calendar-day-details" : undefined}
              onClick={() => setSelectedDay(day)}
              key={day}
            >
              <span className="calendar-date">{day}</span>
              {dueAmount > 0 && <span className={`calendar-due-amount${hasAutopayOnly ? " calendar-due-amount-autopay" : ""}`}>${dueAmount.toFixed(2)}</span>}
            </button>
          );
        })}
      </div>
      {selectedDay !== null && selectedDateLabel && (
        <section className="monthly-day-details" id="calendar-day-details" aria-labelledby="calendar-day-title" aria-live="polite">
          <header>
            <h3 id="calendar-day-title">{selectedDateLabel}</h3>
            <button type="button" aria-label="Close day details" onClick={() => setSelectedDay(null)}>×</button>
          </header>
          {selectedBills.length === 0 && selectedReminders.length === 0 ? (
            <p className="monthly-day-details-empty">No bills or reminders on this day.</p>
          ) : (
            <div className="monthly-day-details-list">
              {selectedBills.length > 0 && (
                <div className="monthly-day-details-group">
                  <h4>Bills</h4>
                  {selectedBills.map((bill) => (
                    <div className="monthly-day-details-row" key={bill.id}>
                      <span>{bill.name}</span>
                      <strong>${bill.amount.toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              )}
              {selectedReminders.length > 0 && (
                <div className="monthly-day-details-group monthly-day-reminders">
                  <h4>Reminders</h4>
                  {selectedReminders.map((reminder) => (
                    <div className="monthly-day-details-row" key={reminder.id}>
                      <span>{reminder.description}</span>
                      <span className="monthly-day-reminder-badge">Reminder</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
