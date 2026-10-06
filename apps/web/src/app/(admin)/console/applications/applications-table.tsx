"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { DeleteApplicationButton } from "./delete-application-button";

export type ApplicationRow = {
  id: string;
  ref: string;
  company: string;
  country: string;
  payment: string;
  eoi: string;
  date: string;
};

const COLUMNS: DataTableColumn<Record<string, unknown>>[] = [
  {
    key: "ref",
    header: "Reference",
    render: (row) => (
      <Link
        href={`/console/applications/${encodeURIComponent(row.ref === "(draft)" ? String(row.id) : String(row.ref))}`}
        className="font-mono text-xs font-semibold text-brand-600 hover:underline"
      >
        {String(row.ref)}
      </Link>
    ),
  },
  {
    key: "company",
    header: "Company",
    render: (row) => (
      <span className="font-medium">{String(row.company)}</span>
    ),
  },
  {
    key: "country",
    header: "Country",
    hideBelow: "md",
    render: (row) => (
      <span className="text-ink-500">{String(row.country)}</span>
    ),
  },
  {
    key: "payment",
    header: "Payment",
    render: (row) => {
      const v =
        row.payment === "Confirmed" ? "payment-confirmed" : "payment-pending";
      return <StatusBadge variant={v}>{String(row.payment)}</StatusBadge>;
    },
  },
  {
    key: "eoi",
    header: "EOI Status",
    render: (row) => {
      const v = row.eoi === "Submitted" ? "eoi-submitted" : "eoi-draft";
      return <StatusBadge variant={v}>{String(row.eoi)}</StatusBadge>;
    },
  },
  {
    key: "date",
    header: "Start Date",
    hideBelow: "md",
    render: (row) => (
      <span className="text-ink-500">{String(row.date)}</span>
    ),
  },
  {
    key: "actions",
    header: "Actions",
    render: (row) => (
      <div className="flex items-center gap-2">
        <Link
          href={`/console/applications/${encodeURIComponent(row.ref === "(draft)" ? String(row.id) : String(row.ref))}`}
          className="text-xs font-semibold text-brand-600 hover:underline"
        >
          View →
        </Link>
        <Link
          href={`/console/applications/${encodeURIComponent(row.ref === "(draft)" ? String(row.id) : String(row.ref))}/export`}
          className="text-xs font-semibold text-ink-600 hover:underline"
        >
          Export
        </Link>
        <DeleteApplicationButton
          applicationId={String(row.id)}
          reference={String(row.ref)}
          company={String(row.company)}
        />
      </div>
    ),
  },
];

export function ApplicationsTable({ data }: { data: ApplicationRow[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      data={data as unknown as Record<string, unknown>[]}
      rowKey="id"
      searchPlaceholder="Search reference or company…"
      searchKeys={["ref", "company", "country"] as never[]}
      exportLabel="Export"
    />
  );
}
