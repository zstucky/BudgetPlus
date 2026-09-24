import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/households";
import BottomNav from "./bottom-nav";

export default async function SectionPlaceholder({ title }: { title: string }) {
  const membership = await getCurrentMembership();

  if (!membership.userId) redirect("/login");
  if (!membership.householdId) redirect("/setup-household");

  return (
    <main className="section-page">
      <BottomNav />
      <section className="section-placeholder" aria-labelledby="section-title">
        <h1 id="section-title">{title}</h1>
        <p>Not yet implemented</p>
      </section>
    </main>
  );
}
