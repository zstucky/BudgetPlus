"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { updateHousehold } from "./actions";

type HouseholdFormProps = {
  name: string;
  weeklyBudget: number;
};

type FormState = {
  error?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}

export default function HouseholdForm({
  name,
  weeklyBudget,
}: HouseholdFormProps) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateHousehold,
    {},
  );

  return (
    <form className="auth-form" action={formAction}>
      <label htmlFor="name">Household Name</label>

      <input
        id="name"
        name="name"
        type="text"
        defaultValue={name}
        required
        maxLength={100}
      />

      <label htmlFor="weeklyBudget">Weekly Budget</label>

      <div className="setup-budget-input">
        <span aria-hidden="true">$</span>

        <input
          id="weeklyBudget"
          name="weeklyBudget"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          defaultValue={weeklyBudget}
          required
        />
      </div>

      {state.error && (
        <p className="auth-error">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <Link className="auth-switch" href="/">
        Cancel
      </Link>
    </form>
  );
}