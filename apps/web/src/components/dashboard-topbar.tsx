"use client";

import { Bell, FileText, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardTopbar() {
  const pathname = usePathname();
  const isApplications = !pathname.includes("/documents");

  return (
    <header className="flex items-center gap-4 border-b border-ink-300 bg-white px-6 py-3">
      <div className="flex items-center gap-1">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            isApplications ? "bg-ink-100 text-ink-900" : "text-ink-500 hover:bg-ink-100"
          }`}
        >
          <FileText size={15} />
          My Applications
        </Link>
        <Link
          href="/dashboard/documents"
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            !isApplications ? "bg-ink-100 text-ink-900" : "text-ink-500 hover:bg-ink-100"
          }`}
        >
          <FileText size={15} />
          My Documents
        </Link>
      </div>
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
        <input
          placeholder="Search"
          className="w-full rounded-md border border-ink-300 bg-ink-100 py-2 pl-8 pr-4 text-sm outline-none transition focus:border-brand-500 focus:bg-white"
        />
      </div>
      <button className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-300 text-ink-500 transition hover:border-ink-500">
        <Bell size={16} />
      </button>
    </header>
  );
}
