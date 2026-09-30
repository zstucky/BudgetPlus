"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Weekly", href: "/" },
  { label: "Monthly", href: "/monthly" },
  { label: "Totals", href: "/totals" },
  { label: "Lessons", href: "/lessons" },
  { label: "Outreach", href: "/outreach" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {pathname !== "/household" && <Link href="/household" className="household-float-button" aria-label="Household settings">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m3.5 10 8.5-7 8.5 7" />
          <path d="M5.5 9v11h13V9M9.5 20v-6h5v6" />
        </svg>
      </Link>}
      <nav className="bottom-nav" aria-label="Budget sections">
        {tabs.map((tab) => {
          const active = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`bottom-nav-link${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
