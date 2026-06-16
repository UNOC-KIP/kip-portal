import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BankTransfersTable } from "./bank-transfers-table";
import { listPendingBankTransfers } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

export default async function BankTransfersPage() {
  await requireRole(ADMIN_ONLY);

  const transfers = await listPendingBankTransfers();

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "Bank Transfer Queue" },
          ]}
        />

        <Alert className="mb-5 border-amber-200 bg-amber-50 text-amber-800">
          <AlertDescription>
            Pending transfers must be confirmed or rejected within 2 business
            days. Investor Submit buttons remain locked until actioned.
          </AlertDescription>
        </Alert>

        {transfers.length === 0 ? (
          <div className="rounded-xl border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            No bank transfers awaiting confirmation.
          </div>
        ) : (
          <BankTransfersTable data={transfers} />
        )}
      </main>
    </div>
  );
}
