import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "@/app/bottom-nav";
import GoalsManager from "./goals-manager";
import type { Goal } from "../actions";
import { centralDateKey } from "@/lib/dates";

export default async function GoalsPage() {
  const membership = await getCurrentMembership();
  if (!membership.userId) redirect("/login");
  if (!membership.householdId) redirect("/setup-household");
  if (membership.error) return <main className="monthly-page"><BottomNav /><section className="monthly-content"><h1>Goals</h1><p className="monthly-error" role="alert">{membership.error}</p></section></main>;

  const supabase = await createClient();
  const [goalsResult, accountsResult, incomeResult, spendsResult] = await Promise.all([
    supabase.from("goals").select("id, name, target_amount, target_date, start_amount, start_date, color").eq("household_id", membership.householdId).order("target_date", { ascending: true }),
    supabase.from("accounts").select("balance, balance_type").eq("household_id", membership.householdId),
    supabase.from("outreach_income").select("amount").eq("household_id", membership.householdId),
    supabase.from("outreach_spends").select("amount").eq("household_id", membership.householdId),
  ]);
  const error = goalsResult.error ?? accountsResult.error ?? incomeResult.error ?? spendsResult.error;
  if (error) return <main className="monthly-page"><BottomNav /><section className="monthly-content"><h1>Goals</h1><p className="monthly-error" role="alert">We couldn&apos;t load your goals: {error.message}</p></section></main>;
  const goals: Goal[] = (goalsResult.data ?? []).map((goal) => ({ ...goal, target_amount: Number(goal.target_amount), start_amount: Number(goal.start_amount) }));
  const startAmount = (accountsResult.data ?? []).reduce((sum, account) => sum + Number(account.balance) * (account.balance_type === "liability" ? -1 : 1), 0)
    - Math.max(0, (incomeResult.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0) - (spendsResult.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0));

  return <main className="monthly-page"><BottomNav /><GoalsManager initialGoals={goals} today={centralDateKey()} startAmount={startAmount} /></main>;
}
