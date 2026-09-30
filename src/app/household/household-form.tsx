"use client";

import { useActionState } from "react";
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
    <button className="totals-primary-button" type="submit" disabled={pending}>
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
    <form className="settings-form" action={formAction}>
      <label htmlFor="name">Household name</label>

      <input
        id="name"
        name="name"
        type="text"
        defaultValue={name}
        required
        maxLength={100}
      />

      <label htmlFor="weeklyBudget">Weekly budget</label>

      <div className="settings-budget-input">
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
        <p className="monthly-error" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton />

    </form>
  );
}
