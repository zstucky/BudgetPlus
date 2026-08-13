import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/households";
import { SetupForm } from "./setup-form";

export default async function SetupHouseholdPage() {
  const membership = await getCurrentMembership();

  if (!membership.userId) redirect("/login");
  if (membership.error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="auth-brand">Weekly Budget</p>
          <h1>We couldn&apos;t load your household</h1>
          <p className="auth-error">{membership.error}</p>
        </section>
      </main>
    );
  }
  if (membership.householdId) redirect("/");

  return <SetupForm />;
}
