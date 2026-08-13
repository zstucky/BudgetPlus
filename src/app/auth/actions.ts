"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  message?: string;
};

function getCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

function validateCredentials(email: string, password: string) {
  if (!email || !password) return "Enter both an email address and password.";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Enter a valid email address.";
  if (password.length < 6) return "Password must be at least 6 characters.";
}

export async function login(
  _: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = getCredentials(formData);
  const validationError = validateCredentials(email, password);

  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect("/");
}

export async function signup(
  _: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = getCredentials(formData);
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
  const validationError = validateCredentials(email, password);

  if (validationError) return { error: validationError };
  if (password !== passwordConfirmation) return { error: "Passwords do not match." };

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/` },
  });

  if (error) return { error: error.message };
  if (data.session) redirect("/");

  return { message: "Check your email to confirm your account, then sign in." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
