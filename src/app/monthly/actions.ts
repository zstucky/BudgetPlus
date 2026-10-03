"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";

type BillInput = { name: string; amount: number; dueDay: number };
type ReminderInput = { description: string; reminderDay: number };

export async function setRecurringBillAutopay(billId: string, isAutopay: boolean): Promise<{
  isAutopay: boolean | null;
  error: string | null;
}> {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { isAutopay: null, error: "You must be logged in." };
  if (membership.error) return { isAutopay: null, error: membership.error };
  if (!membership.householdId) return { isAutopay: null, error: "You do not belong to a household." };
  if (typeof billId !== "string" || !/^[0-9a-f-]{36}$/i.test(billId)) return { isAutopay: null, error: "Invalid recurring bill." };
  if (typeof isAutopay !== "boolean") return { isAutopay: null, error: "Choose an autopay setting." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_bills")
    .update({ is_autopay: isAutopay })
    .eq("id", billId)
    .eq("household_id", membership.householdId)
    .select("is_autopay")
    .single();

  if (error || !data) return { isAutopay: null, error: error?.message ?? "Unable to update autopay." };
  revalidatePath("/monthly");
  return { isAutopay: data.is_autopay, error: null };
}

export async function addMonthlyReminder(input: ReminderInput): Promise<{
  reminder: { id: string; description: string; reminder_date: string } | null;
  error: string | null;
}> {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { reminder: null, error: "You must be logged in." };
  if (membership.error) return { reminder: null, error: membership.error };
  if (!membership.householdId) return { reminder: null, error: "You do not belong to a household." };
  if (!input || typeof input !== "object") return { reminder: null, error: "Enter valid reminder details." };

  const description = typeof input.description === "string" ? input.description.trim() : "";
  const reminderDay = Number(input.reminderDay);
  if (!description) return { reminder: null, error: "Enter a reminder description." };
  if (description.length > 120) return { reminder: null, error: "Reminder descriptions must be 120 characters or fewer." };
  if (!Number.isInteger(reminderDay) || reminderDay < 1 || reminderDay > 31) return { reminder: null, error: "Choose a due day from 1 to 31." };

  // The existing column is a DATE; store the recurring day in a fixed January date.
  const reminderDate = `2000-01-${String(reminderDay).padStart(2, "0")}`;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monthly_reminders")
    .insert({ household_id: membership.householdId, description, reminder_date: reminderDate })
    .select("id, description, reminder_date")
    .single();

  if (error || !data) return { reminder: null, error: error?.message ?? "Unable to add reminder." };
  revalidatePath("/monthly");
  return { reminder: data, error: null };
}

export async function deleteMonthlyReminder(reminderId: string): Promise<{ error: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { error: "You must be logged in." };
  if (membership.error) return { error: membership.error };
  if (!membership.householdId) return { error: "You do not belong to a household." };
  if (typeof reminderId !== "string" || !/^[0-9a-f-]{36}$/i.test(reminderId)) return { error: "Invalid reminder." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("monthly_reminders")
    .delete()
    .eq("id", reminderId)
    .eq("household_id", membership.householdId);

  if (error) return { error: error.message };
  revalidatePath("/monthly");
  return { error: null };
}

export async function addRecurringBill(input: BillInput): Promise<{
  bill: { id: string; name: string; amount: number; due_day: number; is_autopay: boolean } | null;
  error: string | null;
}> {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { bill: null, error: "You must be logged in." };
  if (membership.error) return { bill: null, error: membership.error };
  if (!membership.householdId) return { bill: null, error: "You do not belong to a household." };
  if (!input || typeof input !== "object") {
    return { bill: null, error: "Enter valid recurring expense details." };
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const amount = Number(input.amount);
  const dueDay = Number(input.dueDay);
  if (!name) return { bill: null, error: "Enter an expense name." };
  if (name.length > 100) return { bill: null, error: "Expense names must be 100 characters or fewer." };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) {
    return { bill: null, error: "Enter a valid amount greater than zero." };
  }
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    return { bill: null, error: "Choose a due day from 1 to 31." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_bills")
    .insert({ household_id: membership.householdId, name, amount, due_day: dueDay, is_autopay: false })
    .select("id, name, amount, due_day, is_autopay")
    .single();

  if (error || !data) {
    return { bill: null, error: error?.message ?? "Unable to add recurring expense." };
  }
  revalidatePath("/monthly");
  return {
    bill: { id: data.id, name: data.name, amount: Number(data.amount), due_day: data.due_day, is_autopay: data.is_autopay },
    error: null,
  };
}

export async function deleteRecurringBill(billId: string): Promise<{ error: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { error: "You must be logged in." };
  if (membership.error) return { error: membership.error };
  if (!membership.householdId) return { error: "You do not belong to a household." };
  if (typeof billId !== "string" || !/^[0-9a-f-]{36}$/i.test(billId)) {
    return { error: "Invalid recurring expense." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_bills")
    .delete()
    .eq("id", billId)
    .eq("household_id", membership.householdId);

  if (error) return { error: error.message };
  revalidatePath("/monthly");
  return { error: null };
}
