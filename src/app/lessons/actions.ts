"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function addLesson(input: { amount: number; lessonDate: string; description: string }): Promise<{
  lesson: { id: string; amount: number; lesson_date: string; description: string } | null;
  error: string | null;
}> {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { lesson: null, error: "You must be logged in." };
  if (membership.error) return { lesson: null, error: membership.error };
  if (!membership.householdId) return { lesson: null, error: "You do not belong to a household." };
  if (!input || typeof input !== "object") return { lesson: null, error: "Enter valid lesson details." };

  const amount = Number(input.amount);
  const lessonDate = typeof input.lessonDate === "string" ? input.lessonDate : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const parsedDate = datePattern.test(lessonDate) ? new Date(`${lessonDate}T00:00:00.000Z`) : null;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) {
    return { lesson: null, error: "Enter an amount greater than zero." };
  }
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== lessonDate) {
    return { lesson: null, error: "Choose a valid lesson date." };
  }
  if (!description) return { lesson: null, error: "Enter a lesson description." };
  if (description.length > 120) return { lesson: null, error: "Descriptions must be 120 characters or fewer." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .insert({ household_id: membership.householdId, amount: amount.toFixed(2), lesson_date: lessonDate, description })
    .select("id, amount, lesson_date, description")
    .single();
  if (error || !data) return { lesson: null, error: error?.message ?? "Unable to add lesson." };
  revalidatePath("/lessons");
  return { lesson: { id: data.id, amount: Number(data.amount), lesson_date: data.lesson_date, description: data.description?.trim() || "Lesson" }, error: null };
}

export async function deleteLesson(lessonId: string): Promise<{ error: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership.userId) return { error: "You must be logged in." };
  if (membership.error) return { error: membership.error };
  if (!membership.householdId) return { error: "You do not belong to a household." };
  if (typeof lessonId !== "string" || !/^[0-9a-f-]{36}$/i.test(lessonId)) return { error: "Invalid lesson." };

  const supabase = await createClient();
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId).eq("household_id", membership.householdId);
  if (error) return { error: error.message };
  revalidatePath("/lessons");
  return { error: null };
}
