"use client";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";
import type { StaffRow } from "@/lib/admin/mappers";

const ROLE_VARIANT: Record<string, StatusVariant> = {
  "TC Member":   "role-tc",
  "LAC Member":  "role-tc",
  "Exco":        "role-exco",
  "Admin":       "role-admin",
};

const COLUMNS: DataTableColumn<Record<string, unknown>>[] = [
  {
    key: "name",
    header: "Name",
    render: (row) => (
      <span className="font-medium text-ink-900">{String(row.name)}</span>
    ),
  },
  {
    key: "email",
    header: "Email",
    render: (row) => (
      <span className="text-ink-500">{String(row.email)}</span>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (row) => {
      const v = ROLE_VARIANT[String(row.role)] ?? "role-admin";
      return <StatusBadge variant={v}>{String(row.role)}</StatusBadge>;
    },
  },
  {
    key: "createdAt",
    header: "Added",
    hideBelow: "md",
    render: (row) => (
      <span className="text-ink-500">{String(row.createdAt)}</span>
    ),
  },
];

export function StaffTable({ data }: { data: StaffRow[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      data={data as unknown as Record<string, unknown>[]}
      rowKey="id"
      searchPlaceholder="Search name, email or role…"
      searchKeys={["name", "email", "role"] as never[]}
    />
  );
}
