"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StaffTable } from "./staff-table";
import { InviteStaffDialog } from "../users/invite-staff-dialog";
import type { StaffRow } from "@/lib/admin/mappers";

export function SettingsClient({ staff }: { staff: StaffRow[] }) {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-screen flex-col bg-ink-100">
        <AdminTopbar />
        <main className="flex-1 p-6 space-y-6">
          <PageHeader
            crumbs={[
              { label: "Dashboard", href: "/console" },
              { label: "Settings" },
            ]}
          />

          {/* ── System Users ── */}
          <section className="rounded-xl border border-ink-300 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-ink-500" />
                <h2 className="text-sm font-bold text-ink-900">System Users</h2>
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                  {staff.length} {staff.length === 1 ? "member" : "members"}
                </span>
              </div>
              <Button size="sm" className="gap-2" onClick={() => setInviteOpen(true)}>
                <Plus size={14} /> Invite staff member
              </Button>
            </div>

            <div className="p-4">
              {staff.length === 0 ? (
                <div className="py-8 text-center text-sm text-ink-400">
                  No staff accounts yet.{" "}
                  <button
                    className="font-semibold text-ink-700 underline"
                    onClick={() => setInviteOpen(true)}
                  >
                    Invite the first one
                  </button>
                </div>
              ) : (
                <StaffTable data={staff} />
              )}
            </div>
          </section>
        </main>
      </div>

      <InviteStaffDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
