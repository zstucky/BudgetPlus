"use client";

import { useState } from "react";
import type { RecurringBill } from "./monthly-dashboard";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthlyCalendar({ bills }: { bills: RecurringBill[] }) {
  const [viewedMonth, setViewedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const firstWeekday = new Date(viewedMonth.year, viewedMonth.month, 1).getDay();
  const daysInMonth = new Date(viewedMonth.year, viewedMonth.month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === viewedMonth.year && today.getMonth() === viewedMonth.month;
  const monthLabel = new Date(viewedMonth.year, viewedMonth.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const totalsByDay = new Map<number, number>();

  for (const bill of bills) {
    totalsByDay.set(bill.due_day, (totalsByDay.get(bill.due_day) ?? 0) + bill.amount);
  }

  function changeMonth(amount: number) {
    setViewedMonth((current) => {
      const next = new Date(current.year, current.month + amount, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <section className="monthly-calendar" aria-label="Monthly bill calendar">
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
          const isToday = isCurrentMonth && today.getDate() === day;
          const accessibleLabel = dueAmount > 0
            ? `${monthLabel} ${day}: $${dueAmount.toFixed(2)} due`
            : `${monthLabel} ${day}: no bills due`;

          return (
            <div
              className={`calendar-day${isToday ? " calendar-day-today" : ""}${dueAmount > 0 ? " calendar-day-due" : ""}`}
              role="gridcell"
              aria-label={accessibleLabel}
              key={day}
            >
              <span className="calendar-date">{day}</span>
              {dueAmount > 0 && <span className="calendar-due-amount">${dueAmount.toFixed(2)}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
