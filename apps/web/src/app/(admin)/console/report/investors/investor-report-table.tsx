"use client";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";
import type { InvestorReportRow } from "@/lib/admin/mappers";

function accountVariant(status: string): StatusVariant {
  if (status === "Active") return "status-active";
  if (status === "Rejected") return "status-rejected";
  return "status-pending";
}

function paymentVariant(status: string): StatusVariant {
  if (status === "Confirmed") return "payment-confirmed";
  if (status === "Not Paid") return "eoi-draft";
  return "payment-pending";
}

const COLUMNS: DataTableColumn<Record<string, unknown>>[] = [
  {
    key: "company",
    header: "Company",
    render: (row) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-ink-900">{String(row.company)}</div>
        <div className="truncate text-[11px] text-ink-400">{String(row.email)}</div>
      </div>
    ),
  },
  {
    key: "country",
    header: "Country",
    hideBelow: "md",
    render: (row) => <span className="text-ink-500">{String(row.country)}</span>,
  },
  {
    key: "sector",
    header: "Sector",
    hideBelow: "lg",
    render: (row) => <span className="text-ink-500">{String(row.sector)}</span>,
  },
  {
    key: "zone",
    header: "Zone of Interest",
    render: (row) =>
      row.zoneKey ? (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${String(row.zoneColor)}`} />
            <span className="truncate text-ink-700">{String(row.zone)}</span>
          </div>
          <div className="truncate text-[11px] text-ink-400">
            {String(row.landUse)} · {String(row.acres)}
          </div>
        </div>
      ) : (
        <span className="text-ink-300">Not specified</span>
      ),
  },
  {
    key: "accountStatus",
    header: "Account",
    render: (row) => (
      <StatusBadge variant={accountVariant(String(row.accountStatus))}>
        {String(row.accountStatus)}
      </StatusBadge>
    ),
  },
  {
    key: "paymentStatus",
    header: "Payment",
    render: (row) => (
      <StatusBadge variant={paymentVariant(String(row.paymentStatus))}>
        {String(row.paymentStatus)}
      </StatusBadge>
    ),
  },
  {
    key: "eoiStage",
    header: "EOI Stage",
    render: (row) => <span className="font-medium text-ink-700">{String(row.eoiStage)}</span>,
  },
  {
    key: "reference",
    header: "Reference",
    hideBelow: "lg",
    render: (row) => (
      <span className="font-mono text-[11px] text-ink-500">{String(row.reference)}</span>
    ),
  },
  {
    key: "registeredAt",
    header: "Registered",
    hideBelow: "md",
    render: (row) => <span className="text-ink-500">{String(row.registeredAt)}</span>,
  },
];

export function InvestorReportTable({ data }: { data: InvestorReportRow[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      data={data as unknown as Record<string, unknown>[]}
      rowKey="id"
      pageSize={12}
      searchPlaceholder="Search company, email, country, zone…"
      searchKeys={
        ["company", "email", "country", "sector", "reference", "zone", "landUse"] as never[]
      }
      emptyState="No investors match the current filters."
    />
  );
}
