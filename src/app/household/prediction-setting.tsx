"use client";

import { useState, useTransition } from "react";
import { setTotalsPredictionPreference } from "./actions";

export default function PredictionSetting({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const nextValue = !enabled;
    setEnabled(nextValue);
    setError(null);
    startTransition(async () => {
      const result = await setTotalsPredictionPreference(nextValue);
      if (result.error) {
        setEnabled(!nextValue);
        setError(result.error);
      }
    });
  }

  return <>
    <label className={`settings-menu-item settings-prediction-setting${pending ? " is-pending" : ""}`}>
      <span className="settings-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M3 17 9 11l4 3 8-8"/><path d="M15 6h6v6"/></svg></span>
      <span className="bill-details"><strong>Show totals prediction</strong><span>Display the projected line on the totals graph</span></span>
      <input type="checkbox" role="switch" aria-label="Show totals prediction" checked={enabled} disabled={pending} onChange={toggle} />
    </label>
    {error && <p className="monthly-error settings-prediction-error" role="alert">{error}</p>}
  </>;
}
