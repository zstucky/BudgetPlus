"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";

export type Account = { id: string; name: string; balance: number; balance_type: "asset" | "liability" };
export type TotalSnapshot = { id: string; total: number; created_at: string };

type ActionResult<T> = { data: T | null; error: string | null };

async function getHousehold() {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { householdId: null, error: "You must be logged in." };
  if (membership.error) return { householdId: null, error: membership.error };
  if (!membership.householdId) return { householdId: null, error: "You do not belong to a household." };
  return { householdId: membership.householdId, error: null };
}

export async function createAccount(input: { name: string; balance: number; balanceType: "asset" | "liability" }): Promise<ActionResult<Account>> {
  const { householdId, error: membershipError } = await getHousehold();
  if (!householdId) return { data: null, error: membershipError };
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const balance = Number(input?.balance);
  if (!name || name.length > 100) return { data: null, error: "Enter an account name of 100 characters or fewer." };
  if (!Number.isFinite(balance) || balance < 0 || balance > 9999999999.99) return { data: null, error: "Enter a valid balance." };
  if (input.balanceType !== "asset" && input.balanceType !== "liability") return { data: null, error: "Choose an account type." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("accounts").insert({ household_id: householdId, name, balance, balance_type: input.balanceType }).select("id, name, balance, balance_type").single();
  if (error || !data) return { data: null, error: error?.message ?? "Unable to add account." };
  revalidatePath("/totals");
  return { data: { ...data, balance: Number(data.balance) }, error: null };
}

export async function updateAccountBalance(input: { accountId: string; amount: number; mode: "add" | "replace" }): Promise<ActionResult<Account>> {
  const { householdId, error: membershipError } = await getHousehold();
  if (!householdId) return { data: null, error: membershipError };
  if (typeof input?.accountId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.accountId)) return { data: null, error: "Invalid account." };
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) return { data: null, error: "Enter a valid balance." };
  if (input.mode !== "add" && input.mode !== "replace") return { data: null, error: "Choose how to update the balance." };

  const supabase = await createClient();
  const { data: account, error: readError } = await supabase.from("accounts").select("id, name, balance, balance_type").eq("id", input.accountId).eq("household_id", householdId).single();
  if (readError || !account) return { data: null, error: readError?.message ?? "Account not found." };
  const nextBalance = input.mode === "add" ? Number(account.balance) + amount : amount;
  if (nextBalance > 9999999999.99) return { data: null, error: "The updated balance is too large." };
  const { data, error } = await supabase.from("accounts").update({ balance: nextBalance, updated_at: new Date().toISOString() }).eq("id", input.accountId).eq("household_id", householdId).select("id, name, balance, balance_type").single();
  if (error || !data) return { data: null, error: error?.message ?? "Unable to update account." };
  revalidatePath("/totals");
  return { data: { ...data, balance: Number(data.balance) }, error: null };
}

export async function recordTotalSnapshot(): Promise<ActionResult<TotalSnapshot>> {
  const { householdId, error: membershipError } = await getHousehold();
  if (!householdId) return { data: null, error: membershipError };
  const supabase = await createClient();
  const { data: accounts, error: readError } = await supabase.from("accounts").select("balance, balance_type").eq("household_id", householdId);
  if (readError) return { data: null, error: readError.message };
  const total = (accounts ?? []).reduce((sum, account) => sum + Number(account.balance) * (account.balance_type === "liability" ? -1 : 1), 0);
  const { data, error } = await supabase.from("total_snapshots").insert({ household_id: householdId, total }).select("id, total, created_at").single();
  if (error || !data) return { data: null, error: error?.message ?? "Unable to record total." };
  revalidatePath("/totals");
  return { data: { ...data, total: Number(data.total) }, error: null };
}
