"use client";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TransferRow = {
  ref: string;
  company: string;
  txRef: string;
  date: string;
  sla: string;
  slaUrgency: "ok" | "warn" | "due" | "overdue";
};

const SLA_CLASSES: Record<TransferRow["slaUrgency"], string> = {
  ok:      "text-ink-500",
  warn:    "text-amber-600 font-semibold",
  due:     "text-red-600 font-semibold",
  overdue: "text-red-700 font-bold",
};

const COLUMNS: DataTableColumn<Record<string, unknown>>[] = [
  {
    key: "ref",
    header: "Application",
    render: (row) => (
      <span className="font-mono text-xs font-semibold text-brand-600">
        {String(row.ref)}
      </span>
    ),
  },
  {
    key: "company",
    header: "Company",
    render: (row) => <span>{String(row.company)}</span>,
  },
  {
    key: "txRef",
    header: "Tx Reference",
    hideBelow: "md",
    render: (row) => (
      <span className="font-mono text-xs text-ink-500">{String(row.txRef)}</span>
    ),
  },
  {
    key: "date",
    header: "Date Uploaded",
    hideBelow: "md",
    render: (row) => (
      <span className="text-ink-500">{String(row.date)}</span>
    ),
  },
  {
    key: "sla",
    header: "SLA",
    render: (row) => (
      <span
        className={cn(
          "text-xs",
          SLA_CLASSES[(row.slaUrgency as TransferRow["slaUrgency"]) ?? "ok"],
        )}
      >
        {String(row.sla)}
      </span>
    ),
  },
  {
    key: "proof",
    header: "Proof",
    render: () => (
      <Button
        variant="outline"
        size="sm"
        className="h-7 border-green-200 bg-green-50 text-xs text-green-700 hover:bg-green-100"
      >
        View
      </Button>
    ),
  },
  {
    key: "actions",
    header: "Actions",
    render: () => (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-7 bg-green-500 text-xs hover:bg-green-600"
        >
          Confirm
        </Button>
        <Button variant="destructive" size="sm" className="h-7 text-xs">
          Reject
        </Button>
      </div>
    ),
  },
];

export function BankTransfersTable({ data }: { data: TransferRow[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      data={data as unknown as Record<string, unknown>[]}
      rowKey="ref"
      searchPlaceholder="Search company or reference…"
      searchKeys={["ref", "company", "txRef"] as never[]}
      exportLabel="Export"
    />
  );
}
