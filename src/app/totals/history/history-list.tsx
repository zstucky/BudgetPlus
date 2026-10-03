"use client";

import { useState } from "react";
import { deleteTotalSnapshot, type TotalSnapshot } from "../actions";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function HistoryList({ initialSnapshots }: { initialSnapshots: TotalSnapshot[] }) {
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function removeSnapshot(snapshot: TotalSnapshot) {
    const confirmed = window.confirm(
      `Delete the ${money(snapshot.total)} point recorded on ${new Date(snapshot.created_at).toLocaleString()}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setError(null);
    setDeletingId(snapshot.id);
    try {
      const result = await deleteTotalSnapshot(snapshot.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSnapshots((current) => current.filter((point) => point.id !== snapshot.id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section className="monthly-bills totals-history-list" aria-label="Net worth graph points">
        <div className="monthly-list-heading">
          <h2>Net worth snapshots</h2>
          <span>{snapshots.length}</span>
        </div>
        {snapshots.length === 0 ? (
          <p className="monthly-empty">Record your first total to start tracking your history.</p>
        ) : (
          <ul>
            {snapshots.map((snapshot) => (
              <li key={snapshot.id}>
                <div className="bill-details">
                  <strong>
                    <time dateTime={snapshot.created_at}>
                      {new Date(snapshot.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </strong>
                  <span>Net worth</span>
                </div>
                <strong className="bill-amount">{money(snapshot.total)}</strong>
                <button
                  type="button"
                  className="bill-delete totals-history-delete"
                  aria-label={`Delete history point ${money(snapshot.total)}`}
                  disabled={deletingId === snapshot.id}
                  onClick={() => removeSnapshot(snapshot)}
                >
                  {deletingId === snapshot.id ? "…" : "×"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {error && <p className="monthly-error" role="alert">{error}</p>}
    </>
  );
}
