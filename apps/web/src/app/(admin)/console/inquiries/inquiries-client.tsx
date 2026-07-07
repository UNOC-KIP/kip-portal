"use client";

import { useState } from "react";
import { Inbox, Mail, Bell } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import type { InquiriesView } from "@/lib/admin/queries";
import type { InquiryRow } from "@/lib/admin/mappers";
import { InquiryStatusButtons } from "./inquiry-status-buttons";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  New:       "status-pending",
  Responded: "status-active",
  Closed:    "window-closed",
};

const STATUS_FILTERS = ["All", "New", "Responded", "Closed"] as const;

const SIGNUP_COLUMNS: DataTableColumn<Record<string, unknown>>[] = [
  {
    key: "email",
    header: "Email",
    render: (row) => <span className="font-medium text-ink-900">{String(row.email)}</span>,
  },
  {
    key: "signedUpAt",
    header: "Signed Up",
    render: (row) => <span className="text-ink-500">{String(row.signedUpAt)}</span>,
  },
];

function InquiryCard({ inquiry }: { inquiry: InquiryRow }) {
  const mailto = `mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${inquiry.subject === "—" ? "Your KIP inquiry" : inquiry.subject} — KIP Investor Relations`)}`;
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-ink-900">{inquiry.name}</span>
            <a href={mailto} className="text-sm text-blue-700 underline underline-offset-2 hover:text-blue-900">
              {inquiry.email}
            </a>
            {inquiry.company !== "—" && <span className="text-sm text-ink-500">· {inquiry.company}</span>}
          </div>
          <p className="mt-0.5 text-xs text-ink-400">
            {inquiry.channel} · {inquiry.subject} · Received {inquiry.receivedAt}
          </p>
        </div>
        <StatusBadge variant={STATUS_VARIANT[inquiry.status] ?? "status-pending"}>{inquiry.status}</StatusBadge>
      </div>
      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-ink-100/60 px-4 py-3 text-sm leading-relaxed text-ink-700">
        {inquiry.message}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <InquiryStatusButtons inquiryId={inquiry.id} rawStatus={inquiry.rawStatus} />
        {inquiry.respondedBy !== "—" && (
          <p className="text-xs text-ink-400">
            {inquiry.status} by {inquiry.respondedBy} · {inquiry.respondedAt}
          </p>
        )}
      </div>
    </div>
  );
}

export function InquiriesClient({ view }: { view: InquiriesView }) {
  const [tab, setTab] = useState<"inquiries" | "signups">("inquiries");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");

  const filtered =
    statusFilter === "All" ? view.inquiries : view.inquiries.filter((i) => i.status === statusFilter);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "Inquiries" },
          ]}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="New Inquiries" value={view.newCount} subtext="Awaiting a response" icon={Inbox} highlight={view.newCount > 0} />
          <StatCard label="Total Inquiries" value={view.inquiries.length} subtext="Contact form + live chat" icon={Mail} />
          <StatCard label="Notify Signups" value={view.signups.length} subtext="Waiting for the next window" icon={Bell} />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg border border-ink-200 bg-white p-1">
            {(
              [
                ["inquiries", `Inquiries (${view.inquiries.length})`],
                ["signups", `Notify List (${view.signups.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                  tab === key ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "inquiries" && (
            <div className="flex gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    statusFilter === f
                      ? "bg-ink-900 text-white"
                      : "border border-ink-200 bg-white text-ink-500 hover:text-ink-900"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === "inquiries" ? (
          filtered.length === 0 ? (
            <div className="rounded-xl border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
              {statusFilter === "All"
                ? "No inquiries yet. Contact-form and live-chat messages will appear here."
                : `No ${statusFilter.toLowerCase()} inquiries.`}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((inquiry) => (
                <InquiryCard key={inquiry.id} inquiry={inquiry} />
              ))}
            </div>
          )
        ) : view.signups.length === 0 ? (
          <div className="rounded-xl border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            No notify-me signups yet. Emails submitted on the portal home page will appear here.
          </div>
        ) : (
          <DataTable
            columns={SIGNUP_COLUMNS}
            data={view.signups as unknown as Record<string, unknown>[]}
            rowKey="id"
            searchPlaceholder="Search email…"
            searchKeys={["email"] as never[]}
            exportLabel="Export"
          />
        )}
      </main>
    </div>
  );
}
