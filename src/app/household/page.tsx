import { redirect } from "next/navigation";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "../bottom-nav";
import HouseholdForm from "./household-form";

export default async function HouseholdPage() {
  const membership = await getCurrentMembership();

  if (!membership.userId) {
    redirect("/login");
  }

  if (membership.error) {
    return (
      <main className="monthly-page">
        <BottomNav />
        <section className="monthly-content settings-content">
          <header className="monthly-heading"><h1>Settings</h1></header>
          <p className="monthly-error" role="alert">We couldn&apos;t load your household: {membership.error}</p>
        </section>
      </main>
    );
  }

  if (!membership.householdId) {
    redirect("/setup-household");
  }

  const supabase = await createClient();

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("name, weekly_budget, monthly_income")
    .eq("id", membership.householdId)
    .single();

  if (householdError || !household) {
    return (
      <main className="monthly-page">
        <BottomNav />
        <section className="monthly-content settings-content">
          <header className="monthly-heading"><h1>Settings</h1></header>
          <p className="monthly-error" role="alert">We couldn&apos;t load your household: {householdError?.message ?? "Household not found."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="monthly-page">
      <BottomNav />
      <section className="monthly-content settings-content" aria-labelledby="settings-title">
        <header className="monthly-heading">
          <h1 id="settings-title">Settings</h1>
        </header>
        <section className="monthly-bills settings-section-card" aria-labelledby="household-settings-title">
          <div className="monthly-list-heading settings-section-heading"><h2 id="household-settings-title">Household Settings</h2></div>
          <div className="settings-section-body">
            <p className="settings-description">Update your household name, weekly budget, and monthly income.</p>
            <HouseholdForm
              name={household.name}
              weeklyBudget={Number(household.weekly_budget)}
              monthlyIncome={household.monthly_income === null ? null : Number(household.monthly_income)}
            />
          </div>
          <Link href="/cars" className="settings-menu-item settings-household-link">
            <span className="settings-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M5 12 6.6 7.5A2 2 0 0 1 8.5 6h7a2 2 0 0 1 1.9 1.5L19 12l1.5 1v5h-17v-5L5 12Z"/><path d="M4 13h16M7.5 15.5h.01M16.5 15.5h.01M7 18v1m10-1v1"/></svg></span>
            <span className="bill-details"><strong>Cars</strong><span>Manage vehicles and maintenance</span></span>
            <span className="totals-chevron" aria-hidden="true">›</span>
          </Link>
        </section>
        <section className="monthly-bills settings-section-card settings-user-card" aria-labelledby="user-settings-title">
          <div className="monthly-list-heading settings-section-heading"><h2 id="user-settings-title">User Settings</h2></div>
          <button type="button" className="settings-menu-item settings-placeholder-button" disabled>
            <span className="settings-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></span>
            <span className="bill-details"><strong>Enable Notifications</strong><span>Push notifications are coming soon</span></span>
            <span className="settings-coming-soon">Soon</span>
          </button>
          <form action={logout} className="settings-inline-logout">
            <button type="submit" className="settings-menu-item settings-logout-button">
              <span className="settings-menu-icon settings-logout-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg></span>
              <span className="bill-details"><strong>Log Out</strong><span>Sign out of this account</span></span>
              <span className="settings-menu-spacer" aria-hidden="true" />
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
