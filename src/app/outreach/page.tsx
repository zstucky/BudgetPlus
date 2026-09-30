import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "../bottom-nav";
import OutreachDashboard from "./outreach-dashboard";
import type { OutreachIncome, OutreachSpend } from "./actions";

export default async function OutreachPage() {
  const membership = await getCurrentMembership();
  if (!membership.userId) redirect("/login");
  if (membership.error) return <OutreachLoadError message={membership.error} />;
  if (!membership.householdId) redirect("/setup-household");

  const supabase = await createClient();
  const [incomeResult, spendsResult] = await Promise.all([
    supabase.from("outreach_income").select("id, amount, description, created_at").eq("household_id", membership.householdId).order("created_at", { ascending: false }),
    supabase.from("outreach_spends").select("id, amount, description, impact, created_at").eq("household_id", membership.householdId).order("created_at", { ascending: false }),
  ]);
  if (incomeResult.error) return <OutreachLoadError message={incomeResult.error.message} />;
  if (spendsResult.error) return <OutreachLoadError message={spendsResult.error.message} />;

  const income: OutreachIncome[] = (incomeResult.data ?? []).map((entry) => ({ ...entry, amount: Number(entry.amount) }));
  const spends: OutreachSpend[] = (spendsResult.data ?? []).map((entry) => ({ ...entry, amount: Number(entry.amount) }));
  return <main className="monthly-page"><BottomNav /><OutreachDashboard initialIncome={income} initialSpends={spends} /></main>;
}

function OutreachLoadError({ message }: { message: string }) {
  return <main className="monthly-page"><BottomNav /><section className="monthly-content"><h1>Outreach</h1><p className="monthly-error" role="alert">We couldn&apos;t load your outreach fund: {message}</p></section></main>;
}
