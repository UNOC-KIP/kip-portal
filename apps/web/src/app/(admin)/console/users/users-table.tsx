"use client";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export type UserRow = {
  company: string;
  email: string;
  role: string;
  ref: string;
  status: string;
  lastLogin: string;
};

const ROLE_VARIANT: Record<string, StatusVariant> = {
  Investor:    "role-investor",
  "TC Member": "role-tc",
  Exco:        "role-exco",
  Admin:       "role-admin",
};

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Active:  "status-active",
  Pending: "status-pending",
};

const COLUMNS: DataTableColumn<Record<string, unknown>>[] = [
  {
    key: "company",
    header: "Company Name",
    render: (row) => (
      <span className="font-medium text-ink-900">{String(row.company)}</span>
    ),
  },
  {
    key: "email",
    header: "Email address",
    render: (row) => (
      <span className="text-ink-500">{String(row.email)}</span>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (row) => {
      const v = ROLE_VARIANT[String(row.role)] ?? "role-investor";
      return <StatusBadge variant={v}>{String(row.role)}</StatusBadge>;
    },
  },
  {
    key: "ref",
    header: "Reference",
    hideBelow: "md",
    render: (row) => (
      <span className="font-mono text-xs text-ink-500">{String(row.ref)}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      const v = STATUS_VARIANT[String(row.status)] ?? "status-pending";
      return <StatusBadge variant={v}>{String(row.status)}</StatusBadge>;
    },
  },
  {
    key: "lastLogin",
    header: "Last Login",
    hideBelow: "lg",
    render: (row) => (
      <span className="text-ink-500">{String(row.lastLogin)}</span>
    ),
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

export function UsersTable({ data }: { data: UserRow[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      data={data as unknown as Record<string, unknown>[]}
      rowKey="ref"
      searchPlaceholder="Search company or email…"
      searchKeys={["company", "email", "role"] as never[]}
      exportLabel="Export"
    />
  );
}
