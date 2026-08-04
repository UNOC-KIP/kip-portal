"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Info, Plus, Users } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StaffTable } from "./staff-table";
import { InviteStaffDialog } from "../users/invite-staff-dialog";
import type {
  EoiCallReadiness,
  StaffRow,
  TimelineMilestoneRow,
} from "@/lib/admin/mappers";
import { TimelineEditor } from "./timeline-editor";

/**
 * Flags the case where the timeline says the Call for EOI is running but the
 * `ApplicationWindow` that actually gates applications is not open (or the
 * reverse). Marking the EOI stage CURRENT is the intuitive way to "open the
 * call" and it opens nothing — without this banner the only symptom is investors
 * seeing "The EOI application window is not currently open".
 */
function EoiCallBanner({ eoiCall }: { eoiCall: EoiCallReadiness }) {
  if (!eoiCall.issue) return null;

  if (eoiCall.issue === "NO_OPEN_WINDOW") {
    const stale = eoiCall.staleWindow;
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
        <div className="flex gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900">
              The portal advertises an open Call for EOI, but no application window is open
            </p>
            <p className="mt-1 text-sm text-amber-800">
              The <strong>Call for EOI</strong> milestone below is the current stage, so the
              investor portal and the public schedule show the call as running. Milestones are
              display only — starting and submitting an EOI is gated by an{" "}
              <strong>application window</strong>. Right now investors see &ldquo;The EOI
              application window is not currently open&rdquo; and cannot apply.
              {stale && (
                <>
                  {" "}
                  The window <strong>{stale.name}</strong> is marked open but{" "}
                  {stale.reason === "ALREADY_CLOSED"
                    ? "its closing date has already passed"
                    : "has not reached its opening date yet"}
                  .
                </>
              )}
              {!stale && " There is no window in the open state at all."}
            </p>
            <Link
              href="/console/windows"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-900 underline underline-offset-2"
            >
              Open or adjust the application window
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
      <div className="flex gap-3">
        <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-blue-900">
            Applications are open, but the timeline doesn&apos;t say so
          </p>
          <p className="mt-1 text-sm text-blue-800">
            The window <strong>{eoiCall.liveWindowName}</strong> is accepting EOIs, yet no
            Call for EOI milestone is marked as the current stage — so the public schedule and
            the portal stage tracker still point somewhere else. Investors can apply; they just
            won&apos;t be told the call is running.
          </p>
        </div>
      </div>
    </div>
  );
}

export function SettingsClient({
  staff,
  milestones,
  eoiCall,
}: {
  staff: StaffRow[];
  milestones: TimelineMilestoneRow[];
  eoiCall: EoiCallReadiness;
}) {
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

          <EoiCallBanner eoiCall={eoiCall} />

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

          {/* ── Application Timeline ── */}
          <TimelineEditor milestones={milestones} />
        </main>
      </div>

      <InviteStaffDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
