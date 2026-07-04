"use client";

import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { UsersTable } from "./users-table";
import type { UserRow } from "./users-table";

export function UsersClient({ investors }: { investors: UserRow[] }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "Investors" },
          ]}
        />
        {investors.length === 0 ? (
          <div className="rounded-xl border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            No investors registered yet.
          </div>
        ) : (
          <UsersTable data={investors} />
        )}
      </main>
    </div>
  );
}
