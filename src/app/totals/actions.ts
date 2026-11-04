"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";

export type Account = { id: string; name: string; balance: number; balance_type: "asset" | "liability" };
export type TotalSnapshot = { id: string; total: number; created_at: string };
export type Goal = { id: string; name: string; target_amount: number; target_date: string; start_amount: number; start_date: string; color: string };

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

export async function deleteAccount(accountId: string): Promise<{ error: string | null }> {
  const { householdId, error: membershipError } = await getHousehold();
  if (!householdId) return { error: membershipError };
  if (typeof accountId !== "string" || !/^[0-9a-f-]{36}$/i.test(accountId)) return { error: "Invalid account." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("accounts").delete().eq("id", accountId).eq("household_id", householdId).select("id").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Account not found." };
  revalidatePath("/totals");
  return { error: null };
}

export async function deleteTotalSnapshot(snapshotId: string): Promise<{ error: string | null }> {
  const { householdId, error: membershipError } = await getHousehold();
  if (!householdId) return { error: membershipError };
  if (typeof snapshotId !== "string" || !/^[0-9a-f-]{36}$/i.test(snapshotId)) return { error: "Invalid history point." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("total_snapshots")
    .delete()
    .eq("id", snapshotId)
    .eq("household_id", householdId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "History point not found." };
  revalidatePath("/totals");
  revalidatePath("/totals/history");
  return { error: null };
}

export async function recordTotalSnapshot(): Promise<ActionResult<TotalSnapshot>> {
  const { householdId, error: membershipError } = await getHousehold();
  if (!householdId) return { data: null, error: membershipError };
  const supabase = await createClient();
  const [accountsResult, incomeResult, spendsResult] = await Promise.all([
    supabase.from("accounts").select("balance, balance_type").eq("household_id", householdId),
    supabase.from("outreach_income").select("amount").eq("household_id", householdId),
    supabase.from("outreach_spends").select("amount").eq("household_id", householdId),
  ]);
  if (accountsResult.error) return { data: null, error: accountsResult.error.message };
  if (incomeResult.error) return { data: null, error: incomeResult.error.message };
  if (spendsResult.error) return { data: null, error: spendsResult.error.message };
  const accounts = accountsResult.data;
  const total = (accounts ?? []).reduce((sum, account) => sum + Number(account.balance) * (account.balance_type === "liability" ? -1 : 1), 0);
  const outreachAvailable = (incomeResult.data ?? []).reduce((sum, entry) => sum + Number(entry.amount), 0)
    - (spendsResult.data ?? []).reduce((sum, entry) => sum + Number(entry.amount), 0);
  const totalWithOutreach = total - Math.max(0, outreachAvailable);
  const { data, error } = await supabase.from("total_snapshots").insert({ household_id: householdId, total: totalWithOutreach }).select("id, total, created_at").single();
  if (error || !data) return { data: null, error: error?.message ?? "Unable to record total." };
  revalidatePath("/totals");
  return { data: { ...data, total: Number(data.total) }, error: null };
}

function validGoal(input: Partial<Goal>) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const targetAmount = Number(input.target_amount);
  const startAmount = Number(input.start_amount);
  const targetDate = typeof input.target_date === "string" ? input.target_date : "";
  const startDate = typeof input.start_date === "string" ? input.start_date : "";
  const color = typeof input.color === "string" ? input.color : "";
  if (!name || name.length > 80) return { error: "Enter a goal name of 80 characters or fewer." };
  if (!Number.isFinite(targetAmount) || targetAmount <= 0 || targetAmount > 9999999999.99) return { error: "Enter a valid target amount." };
  if (!Number.isFinite(startAmount) || Math.abs(startAmount) > 9999999999.99) return { error: "Enter a valid starting amount." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || targetDate <= startDate) return { error: "Choose a target date after the start date." };
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return { error: "Choose a valid goal color." };
  return { value: { name, target_amount: targetAmount, target_date: targetDate, start_amount: startAmount, start_date: startDate, color } };
}

export async function saveGoal(input: Partial<Goal> & { id?: string }): Promise<ActionResult<Goal>> {
  const { householdId, error: membershipError } = await getHousehold();
  if (!householdId) return { data: null, error: membershipError };
  const validated = validGoal(input);
  if (!validated.value) return { data: null, error: validated.error ?? "Invalid goal." };
  if (input.id && !/^[0-9a-f-]{36}$/i.test(input.id)) return { data: null, error: "Invalid goal." };
  const supabase = await createClient();
  const result = input.id
    ? await supabase.from("goals").update(validated.value).eq("id", input.id).eq("household_id", householdId).select("id, name, target_amount, target_date, start_amount, start_date, color").maybeSingle()
    : await supabase.from("goals").insert({ ...validated.value, household_id: householdId }).select("id, name, target_amount, target_date, start_amount, start_date, color").single();
  if (result.error || !result.data) return { data: null, error: result.error?.message ?? "Goal not found." };
  revalidatePath("/totals");
  revalidatePath("/totals/goals");
  return { data: { ...result.data, target_amount: Number(result.data.target_amount), start_amount: Number(result.data.start_amount) }, error: null };
}

export async function deleteGoal(goalId: string): Promise<{ error: string | null }> {
  const { householdId, error: membershipError } = await getHousehold();
  if (!householdId) return { error: membershipError };
  if (typeof goalId !== "string" || !/^[0-9a-f-]{36}$/i.test(goalId)) return { error: "Invalid goal." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("goals").delete().eq("id", goalId).eq("household_id", householdId).select("id").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Goal not found." };
  revalidatePath("/totals");
  revalidatePath("/totals/goals");
  return { error: null };
}
