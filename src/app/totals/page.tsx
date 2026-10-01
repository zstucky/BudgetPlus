import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "../bottom-nav";
import TotalsDashboard from "./totals-dashboard";
import type { Account, TotalSnapshot } from "./actions";

export default async function TotalsPage() {
  const membership = await getCurrentMembership();
  if (!membership.userId) redirect("/login");
  if (membership.error) return <TotalsLoadError message={membership.error} />;
  if (!membership.householdId) redirect("/setup-household");

  const supabase = await createClient();
  const [accountsResult, snapshotsResult, outreachIncomeResult, outreachSpendsResult] = await Promise.all([
    supabase.from("accounts").select("id, name, balance, balance_type").eq("household_id", membership.householdId).order("created_at", { ascending: true }),
    supabase.from("total_snapshots").select("id, total, created_at").eq("household_id", membership.householdId).order("created_at", { ascending: false }).limit(15),
    supabase.from("outreach_income").select("amount").eq("household_id", membership.householdId),
    supabase.from("outreach_spends").select("amount").eq("household_id", membership.householdId),
  ]);
  if (accountsResult.error) return <TotalsLoadError message={accountsResult.error.message} />;
  if (snapshotsResult.error) return <TotalsLoadError message={snapshotsResult.error.message} />;
  if (outreachIncomeResult.error) return <TotalsLoadError message={outreachIncomeResult.error.message} />;
  if (outreachSpendsResult.error) return <TotalsLoadError message={outreachSpendsResult.error.message} />;

  const accounts: Account[] = (accountsResult.data ?? []).map((account) => ({ ...account, balance: Number(account.balance) }));
  const snapshots: TotalSnapshot[] = (snapshotsResult.data ?? []).map((snapshot) => ({ ...snapshot, total: Number(snapshot.total) })).reverse();
  const outreachAvailable = (outreachIncomeResult.data ?? []).reduce((sum, entry) => sum + Number(entry.amount), 0)
    - (outreachSpendsResult.data ?? []).reduce((sum, entry) => sum + Number(entry.amount), 0);
  const outreachLiability = Math.max(0, outreachAvailable);

  return (
    <main className="monthly-page">
      <BottomNav />
      <TotalsDashboard initialAccounts={accounts} initialSnapshots={snapshots} outreachLiability={outreachLiability} />
    </main>
  );
}

function TotalsLoadError({ message }: { message: string }) {
  return <main className="monthly-page"><BottomNav /><section className="monthly-content"><h1>Totals</h1><p className="monthly-error" role="alert">We couldn&apos;t load your accounts: {message}</p></section></main>;
}
