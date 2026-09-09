import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { FinanceQueueTable } from "./finance-queue-table";
import { getFinanceRows } from "@/lib/admin/finance-queries";
import { requireRole } from "@/lib/rbac-server";
import { FINANCE_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function FinanceQueuePage() {
  await requireRole(FINANCE_ROLES);
  const rows = await getFinanceRows();

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Finance", href: "/console/finance" },
            { label: "Payments & invoices" },
          ]}
        />
        <div className="mb-5">
          <h1 className="text-2xl font-bold">Payments &amp; invoices</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Send each applicant their fee invoice, then verify the payment once
            the transfer is received. Verifying only flags the payment — it does
            not affect the review pipeline.
          </p>
        </div>
        <FinanceQueueTable rows={rows} />
      </main>
    </div>
  );
}
