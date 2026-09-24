"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Weekly", href: "/" },
  { label: "Monthly", href: "/monthly" },
  { label: "Totals", href: "/totals" },
  { label: "Lessons", href: "/lessons" },
  { label: "Cars", href: "/cars" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
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
  );
}
