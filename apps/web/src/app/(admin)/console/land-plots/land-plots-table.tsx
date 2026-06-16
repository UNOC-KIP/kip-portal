"use client";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export type PlotRow = {
  id: string;
  cat: string;
  area: number;
  to: string;
  date: string;
  status: string;
};

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Allocated: "plot-allocated",
  Reserved:  "plot-reserved",
  "On Hold": "plot-hold",
  Available: "plot-available",
};

const COLUMNS: DataTableColumn<Record<string, unknown>>[] = [
  {
    key: "id",
    header: "Plot ID",
    render: (row) => <span className="font-bold">{String(row.id)}</span>,
  },
  {
    key: "cat",
    header: "Category",
    hideBelow: "md",
    render: (row) => <span className="text-ink-500">{String(row.cat)}</span>,
  },
  {
    key: "area",
    header: "Area (ha)",
    render: (row) => <span>{String(row.area)}</span>,
  },
  {
    key: "to",
    header: "Allocated To",
    render: (row) => <span className="text-ink-500">{String(row.to)}</span>,
  },
  {
    key: "date",
    header: "Date Uploaded",
    hideBelow: "lg",
    render: (row) => <span className="text-ink-500">{String(row.date)}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      const v = STATUS_VARIANT[String(row.status)] ?? "plot-available";
      return <StatusBadge variant={v}>{String(row.status)}</StatusBadge>;
    },
  },
  {
    key: "actions",
    header: "Actions",
    render: () => (
      <Button variant="ghost" size="sm" className="h-7 text-ink-400">
        •••
      </Button>
    ),
  },
];

export function LandPlotsTable({ data }: { data: PlotRow[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      data={data as unknown as Record<string, unknown>[]}
      rowKey="id"
      searchPlaceholder="Search plot ID or company…"
      searchKeys={["id", "to", "cat"] as never[]}
      exportLabel="Export"
    />
  );
}
