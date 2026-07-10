"use client";

import { Bell, FileText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardTopbar() {
  const pathname = usePathname();
  const isApplications =
    !pathname.includes("/documents") && !pathname.includes("/site-visit");

  return (
    <header className="flex items-center gap-2 border-b border-ink-300 bg-white py-3 pl-14 pr-4 sm:gap-4 md:px-6">
      <div className="flex items-center gap-1">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition sm:px-3 ${
            isApplications ? "bg-ink-100 text-ink-900" : "text-ink-500 hover:bg-ink-100"
          }`}
        >
          <FileText size={15} className="shrink-0" />
          <span className="whitespace-nowrap"><span className="hidden sm:inline">My </span>Applications</span>
        </Link>
        <Link
          href="/dashboard/documents"
          className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition sm:px-3 ${
            !isApplications ? "bg-ink-100 text-ink-900" : "text-ink-500 hover:bg-ink-100"
          }`}
        >
          <FileText size={15} className="shrink-0" />
          <span className="whitespace-nowrap"><span className="hidden sm:inline">My </span>Documents</span>
        </Link>
      </div>
      <div className="flex-1" />
      <button className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-300 text-ink-500 transition hover:border-ink-500">
        <Bell size={16} />
      </button>
    </header>
  );
}
