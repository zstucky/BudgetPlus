"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthFormState } from "./actions";

type AuthFormProps = {
  mode: "login" | "signup";
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  notice?: string;
};

export function AuthForm({ mode, action, notice }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, { message: notice });
  const isSignup = mode === "signup";

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="auth-brand">Weekly Budget</p>
        <h1 id="auth-title">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-copy">
          {isSignup ? "Start keeping track of your weekly spending." : "Sign in to view your weekly budget."}
        </p>

        <form className="auth-form" action={formAction}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} required />

          {isSignup && (
            <>
              <label htmlFor="passwordConfirmation">Confirm password</label>
              <input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" required />
            </>
          )}

          {state.error && <p className="auth-error" role="alert">{state.error}</p>}
          {state.message && <p className="auth-message" role="status">{state.message}</p>}

          <button type="submit" disabled={pending}>
            {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "New to Weekly Budget?"}{" "}
          <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link>
        </p>
      </section>
    </main>
  );
}
