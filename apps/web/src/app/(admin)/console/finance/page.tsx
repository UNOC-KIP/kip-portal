import Link from "next/link";
import { Landmark, FileText, Send, Wallet, CheckCircle2, XCircle } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getFinanceSummary } from "@/lib/admin/finance-queries";
import { requireRole } from "@/lib/rbac-server";
import { FINANCE_ROLES } from "@/lib/rbac";
import { formatMoney } from "@kip/shared";

export const dynamic = "force-dynamic";

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "ink",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "ink" | "amber" | "green" | "red" | "blue";
}) {
  const tones: Record<string, string> = {
    ink: "text-ink-600 bg-ink-100",
    amber: "text-amber-700 bg-amber-100",
    green: "text-green-700 bg-green-100",
    red: "text-red-700 bg-red-100",
    blue: "text-blue-700 bg-blue-100",
  };
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon size={16} />
      </span>
      <p className="mt-3 text-2xl font-bold tracking-tight text-ink-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

export default async function FinanceDashboardPage() {
  await requireRole(FINANCE_ROLES);
  const s = await getFinanceSummary();

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader crumbs={[{ label: "Finance" }]} />
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Landmark size={22} /> Finance
            </h1>
            <p className="mt-0.5 text-sm text-ink-500">
              Application-fee invoicing and payment verification for submitted
              applications.
            </p>
          </div>
          <Button asChild>
            <Link href="/console/finance/queue">Open payments &amp; invoices →</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi icon={FileText} label="Submitted" value={String(s.submitted)} tone="blue" />
          <Kpi icon={Send} label="Awaiting invoice" value={String(s.awaitingInvoice)} tone="amber" />
          <Kpi icon={FileText} label="Invoice sent" value={String(s.invoiceSent)} tone="ink" />
          <Kpi icon={Wallet} label="Receipts to verify" value={String(s.receiptsToVerify)} tone="amber" />
          <Kpi icon={CheckCircle2} label="Paid" value={String(s.paid)} tone="green" />
          <Kpi icon={XCircle} label="Failed" value={String(s.failed)} tone="red" />
        </div>

        <div className="mt-4 rounded-xl border border-ink-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Outstanding (unpaid, incl. VAT)
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight text-ink-900">
            {formatMoney(s.outstandingTotal, s.currency)}
          </p>
        </div>
      </main>
    </div>
  );
}
