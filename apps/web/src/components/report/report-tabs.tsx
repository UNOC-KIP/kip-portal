"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/console/report", label: "Overview", exact: true },
  { href: "/console/report/investors", label: "Investors" },
  { href: "/console/report/applications", label: "Applications" },
  { href: "/console/report/payments", label: "Payments" },
  { href: "/console/report/site-visits", label: "Site Visits" },
  { href: "/console/report/engagement", label: "Engagement" },
];

/** Tab bar for the reports hub — one route per report. */
export function ReportTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-ink-200 print:hidden" aria-label="Reports">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-brand-500 font-bold text-ink-900"
                : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
