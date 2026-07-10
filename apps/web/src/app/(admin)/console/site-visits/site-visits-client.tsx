"use client";

import { useState } from "react";
import { CalendarDays, CalendarCheck, MapPin } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";
import type { SiteVisitsView } from "@/lib/admin/queries";
import type { SiteVisitRow } from "@/lib/admin/mappers";
import { SiteVisitActions } from "./site-visit-actions";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  NEW:       "status-pending",
  SCHEDULED: "window-active",
  COMPLETED: "tc-approved",
  CANCELLED: "window-closed",
};

const STATUS_FILTERS = ["All", "New Request", "Visit Scheduled", "Visit Completed", "Cancelled"] as const;

function SiteVisitCard({ booking }: { booking: SiteVisitRow }) {
  const mailto = `mailto:${booking.contactEmail}?subject=${encodeURIComponent("Your KIP site visit — Kabalega Industrial Park")}`;
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-ink-900">{booking.companyName}</span>
            <span className="text-sm text-ink-500">· {booking.contactName}</span>
            <a href={mailto} className="text-sm text-blue-700 underline underline-offset-2 hover:text-blue-900">
              {booking.contactEmail}
            </a>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
            <span className={`inline-block h-2 w-2 rounded-sm ${booking.zoneColor}`} />
            <span className="font-medium text-ink-600">{booking.zone}</span>
            · {booking.landUse} · {booking.acresLabel} · Requested {booking.requestedAt}
          </p>
        </div>
        <StatusBadge variant={STATUS_VARIANT[booking.rawStatus] ?? "status-pending"}>
          {booking.status}
        </StatusBadge>
      </div>

      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-ink-100/60 px-4 py-3 text-sm leading-relaxed text-ink-700">
        {booking.description}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <SiteVisitActions bookingId={booking.id} rawStatus={booking.rawStatus} />
        <p className="text-xs text-ink-400">
          {booking.scheduledAt !== "—" && <>Visit on {booking.scheduledAt} · </>}
          {booking.handledBy !== "—" && <>Handled by {booking.handledBy}</>}
        </p>
      </div>
    </div>
  );
}

export function SiteVisitsClient({ view }: { view: SiteVisitsView }) {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");

  const filtered =
    statusFilter === "All"
      ? view.bookings
      : view.bookings.filter((b) => b.status === statusFilter);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "Site Visits" },
          ]}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="New Requests"
            value={view.newCount}
            subtext="Awaiting scheduling"
            icon={CalendarDays}
            highlight={view.newCount > 0}
          />
          <StatCard
            label="Scheduled Visits"
            value={view.scheduledCount}
            subtext="Dates confirmed"
            icon={CalendarCheck}
          />
          <StatCard
            label="Total Requests"
            value={view.bookings.length}
            subtext="All time"
            icon={MapPin}
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-1">
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

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            {statusFilter === "All"
              ? "No site visit requests yet. Investor bookings will appear here."
              : `No requests with status “${statusFilter}”.`}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((booking) => (
              <SiteVisitCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
