"use client";

import { useActionState } from "react";
import { createHousehold, type SetupFormState } from "./actions";

const initialState: SetupFormState = {};

export function SetupForm() {
  const [state, formAction, pending] = useActionState(createHousehold, initialState);

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="setup-title">
        <p className="auth-brand">Weekly Budget</p>
        <h1 id="setup-title">Set up your household</h1>
        <p className="auth-copy">Create the shared budget space for your household.</p>

        <form className="auth-form" action={formAction}>
          <label htmlFor="name">Household name</label>
          <input id="name" name="name" type="text" placeholder="The Smith household" autoComplete="organization" required />

          <label htmlFor="weeklyBudget">Weekly budget</label>
          <div className="setup-budget-input">
            <span aria-hidden="true">$</span>
            <input id="weeklyBudget" name="weeklyBudget" type="number" inputMode="decimal" min="0.01" step="0.01" defaultValue="150" required />
          </div>

          {state.error && <p className="auth-error" role="alert">{state.error}</p>}
          <button type="submit" disabled={pending}>{pending ? "Creating…" : "Create household"}</button>
        </form>
      </section>
    </main>
  );
}
