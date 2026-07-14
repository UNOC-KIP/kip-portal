"use client";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";

/**
 * Declarative column spec for report detail tables. Serialisable (no render
 * functions), so server report pages can pass it straight to this client
 * component. `badge` maps a cell value to a StatusBadge variant.
 */
export type ReportColumn = {
  key: string;
  header: string;
  hideBelow?: "sm" | "md" | "lg";
  kind?: "text" | "muted" | "mono" | "bold";
  badge?: Record<string, StatusVariant>;
};

const KIND_CLASS: Record<NonNullable<ReportColumn["kind"]>, string> = {
  text: "text-ink-700",
  muted: "text-ink-500",
  mono: "font-mono text-[11px] text-ink-500",
  bold: "font-medium text-ink-900",
};

function toDataTableColumn(col: ReportColumn): DataTableColumn<Record<string, unknown>> {
  return {
    key: col.key,
    header: col.header,
    hideBelow: col.hideBelow,
    render: (row) => {
      const value = String(row[col.key] ?? "—");
      if (col.badge) {
        return (
          <StatusBadge variant={col.badge[value] ?? "status-pending"}>{value}</StatusBadge>
        );
      }
      return <span className={KIND_CLASS[col.kind ?? "text"]}>{value}</span>;
    },
  };
}

export function ReportTable({
  columns,
  rows,
  searchKeys,
  searchPlaceholder = "Search…",
  pageSize = 12,
  empty = "No data yet.",
}: {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  searchKeys: string[];
  searchPlaceholder?: string;
  pageSize?: number;
  empty?: string;
}) {
  return (
    <DataTable
      columns={columns.map(toDataTableColumn)}
      data={rows}
      rowKey="id"
      pageSize={pageSize}
      searchPlaceholder={searchPlaceholder}
      searchKeys={searchKeys as never[]}
      emptyState={empty}
    />
  );
}
