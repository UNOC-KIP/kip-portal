"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CalendarCheck, CheckCircle2, MapPin, Search, ChevronRight } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SiteVisitsView } from "@/lib/admin/queries";
import type { SiteVisitRow } from "@/lib/admin/mappers";
import { SiteVisitDetailModal } from "./site-visit-detail-modal";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  NEW:       "status-pending",
  SCHEDULED: "window-active",
  COMPLETED: "tc-approved",
  CANCELLED: "window-closed",
};

const STATUS_FILTERS = ["All", "New Request", "Visit Scheduled", "Visit Completed", "Cancelled"] as const;

function matches(b: SiteVisitRow, q: string): boolean {
  const hay = `${b.companyName} ${b.contactName} ${b.contactEmail} ${b.zone} ${b.landUse}`.toLowerCase();
  return hay.includes(q);
}

/**
 * Admin site-visit tracker: searchable, filterable table of bookings; any row
 * opens a detail modal with the full request plus the investor behind it
 * (rep, company profile, account status, EOI progress) and the status actions.
 */
export function SiteVisitsClient({ view }: { view: SiteVisitsView }) {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  // Store only the id — the modal re-derives the row from props, so it shows
  // fresh data after the actions call router.refresh().
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return view.bookings.filter(
      (b) => (statusFilter === "All" || b.status === statusFilter) && (q === "" || matches(b, q)),
    );
  }, [view.bookings, statusFilter, query]);

  const completedCount = view.bookings.filter((b) => b.rawStatus === "COMPLETED").length;
  const selected = selectedId ? view.bookings.find((b) => b.id === selectedId) ?? null : null;

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[{ label: "Dashboard", href: "/console" }, { label: "Site Visits" }]}
        />

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            label="Completed"
            value={completedCount}
            subtext="Visits conducted"
            icon={CheckCircle2}
          />
          <StatCard
            label="Total Requests"
            value={view.bookings.length}
            subtext="All time"
            icon={MapPin}
          />
        </div>

        <div className="rounded-xl border border-ink-200 bg-white">
          {/* Toolbar: search + status filter pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
            <div className="relative w-full max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search company, contact, zone…"
                className="h-9 pl-9 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1">
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
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-500">
              {view.bookings.length === 0
                ? "No site visit requests yet. Investor bookings will appear here."
                : "No requests match the current search / filter."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="hidden sm:table-cell">Zone</TableHead>
                  <TableHead className="hidden lg:table-cell">Land Use</TableHead>
                  <TableHead className="hidden md:table-cell">Acres</TableHead>
                  <TableHead className="hidden lg:table-cell">Requested</TableHead>
                  <TableHead className="hidden md:table-cell">Visit Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => (
                  <TableRow
                    key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">{b.companyName}</p>
                        <p className="truncate text-[11px] text-ink-400">
                          {b.contactName !== "—" ? `${b.contactName} · ` : ""}
                          {b.contactEmail}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="flex items-center gap-1.5 text-ink-600">
                        <span className={`inline-block h-2 w-2 shrink-0 rounded-sm ${b.zoneColor}`} />
                        {b.zone}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-ink-500 lg:table-cell">{b.landUse}</TableCell>
                    <TableCell className="hidden text-ink-500 md:table-cell">{b.acresLabel}</TableCell>
                    <TableCell className="hidden text-ink-500 lg:table-cell">{b.requestedAt}</TableCell>
                    <TableCell className="hidden text-ink-500 md:table-cell">{b.scheduledAt}</TableCell>
                    <TableCell>
                      <StatusBadge variant={STATUS_VARIANT[b.rawStatus] ?? "status-pending"}>
                        {b.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="w-8 text-ink-300">
                      <ChevronRight size={16} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <p className="mt-2 text-[11px] text-ink-400">
          Click a request to see the full booking and the investor behind it.
        </p>
      </main>

      {selected && (
        <SiteVisitDetailModal
          booking={selected}
          statusVariant={STATUS_VARIANT[selected.rawStatus] ?? "status-pending"}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
