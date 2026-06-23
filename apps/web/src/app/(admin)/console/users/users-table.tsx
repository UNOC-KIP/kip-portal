"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export type UserRow = {
  id: string;
  company: string;
  email: string;
  role: string;
  ref: string;
  status: string;
  tin: string;
  country: string;
  phone: string;
  registeredAt: string;
};

const ROLE_VARIANT: Record<string, StatusVariant> = {
  Investor:     "role-investor",
  "TC Member":  "role-tc",
  "LAC Member": "role-tc",
  Exco:         "role-exco",
  Admin:        "role-admin",
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
    header: "Email",
    render: (row) => (
      <span className="text-ink-500">{String(row.email)}</span>
    ),
  },
  {
    key: "tin",
    header: "TIN",
    hideBelow: "md",
    render: (row) => (
      <span className="font-mono text-xs text-ink-600">{String(row.tin)}</span>
    ),
  },
  {
    key: "country",
    header: "Country",
    hideBelow: "lg",
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
    header: "App Ref",
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
    key: "registeredAt",
    header: "Registered",
    hideBelow: "lg",
    render: (row) => (
      <span className="text-ink-500">{String(row.registeredAt)}</span>
    ),
  },
  {
    key: "actions",
    header: "",
    render: (row) => (
      <Link href={`/console/users/${String(row.id)}`}>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-ink-400 hover:text-ink-900">
          View
        </Button>
      </Link>
    ),
  },
];

export function UsersTable({ data }: { data: UserRow[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      data={data as unknown as Record<string, unknown>[]}
      rowKey="id"
      searchPlaceholder="Search company, email or TIN…"
      searchKeys={["company", "email", "tin", "role"] as never[]}
      exportLabel="Export"
    />
  );
}
