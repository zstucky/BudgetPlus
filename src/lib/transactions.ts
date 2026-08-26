import { createClient } from "@/lib/supabase/server";

export type Transaction = {
  id: string;
  amount: number;
  description: string;
  created_at: string;
};

export async function getHouseholdTransactions(
  householdId: string,
): Promise<{ data: Transaction[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select("id, amount, description, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []).map((transaction) => ({
      id: transaction.id,
      amount: Number(transaction.amount),
      description: transaction.description,
      created_at: transaction.created_at,
    })),
    error: null,
  };
}