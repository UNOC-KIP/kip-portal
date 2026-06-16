"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export type TcAppRow = {
  ref: string;
  company: string;
  land: string;
  score: string;
  status: string;
  date: string;
  days: number;
};

const TC_VARIANT: Record<string, StatusVariant> = {
  "In progress": "tc-in-progress",
  Approved:      "tc-approved",
  Rejected:      "tc-rejected",
};

const COLUMNS: DataTableColumn<Record<string, unknown>>[] = [
  {
    key: "ref",
    header: "Reference",
    render: (row) => (
      <Link
        href={`/console/tc/${row.ref}`}
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
    key: "land",
    header: "Land (ha)",
    hideBelow: "md",
    render: (row) => (
      <span className="text-ink-500">{String(row.land)}</span>
    ),
  },
  {
    key: "score",
    header: "AI Score",
    render: (row) => (
      <span className="font-semibold">{String(row.score)}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      const v = TC_VARIANT[String(row.status)] ?? "tc-in-progress";
      return <StatusBadge variant={v}>{String(row.status)}</StatusBadge>;
    },
  },
  {
    key: "date",
    header: "Start Date",
    hideBelow: "lg",
    render: (row) => (
      <span className="text-ink-500">{String(row.date)}</span>
    ),
  },
  {
    key: "days",
    header: "Days in Queue",
    hideBelow: "md",
    render: (row) => (
      <span className="text-ink-500">{String(row.days)}</span>
    ),
  },
  {
    key: "actions",
    header: "Actions",
    render: (row) => (
      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
        <Link href={`/console/tc/${row.ref}`}>Review →</Link>
      </Button>
    ),
  },
];

export function TcQueueTable({ data }: { data: TcAppRow[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      data={data as unknown as Record<string, unknown>[]}
      rowKey="ref"
      searchPlaceholder="Search reference or company…"
      searchKeys={["ref", "company"] as never[]}
      exportLabel="Export"
    />
  );
}
