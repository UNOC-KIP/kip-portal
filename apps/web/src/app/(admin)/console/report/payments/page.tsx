import { CheckCircle2, DollarSign, Hourglass, FileWarning, AlarmClock, Timer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Panel, BarList, MiniStat, TrendBars, PrintHeading } from "@/components/report/report-ui";
import { ReportExportActions } from "@/components/report/export-actions";
import { ReportTable, type ReportColumn } from "@/components/report/report-table";
import { getPaymentsReportData } from "@/lib/admin/queries";
import { buildPaymentsSummary } from "@/lib/report-export";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

const EXPORT_COLUMNS = [
  { header: "Company", key: "company" },
  { header: "Reference", key: "reference" },
  { header: "Amount", key: "amount" },
  { header: "Method", key: "method" },
  { header: "Status", key: "status" },
  { header: "Initiated", key: "initiated" },
  { header: "Confirmed", key: "confirmed" },
];

const TABLE_COLUMNS: ReportColumn[] = [
  { key: "company", header: "Company", kind: "bold" },
  { key: "reference", header: "Reference", kind: "mono", hideBelow: "lg" },
  { key: "amount", header: "Amount", kind: "text" },
  { key: "method", header: "Method", kind: "muted", hideBelow: "md" },
  {
    key: "status",
    header: "Status",
    badge: {
      Confirmed: "payment-confirmed",
      Pending: "payment-pending",
      "Proof Uploaded": "payment-pending",
      Failed: "payment-failed",
      Refunded: "payment-failed",
    },
  },
  { key: "initiated", header: "Initiated", kind: "muted", hideBelow: "md" },
  { key: "confirmed", header: "Confirmed", kind: "muted", hideBelow: "lg" },
];

export default async function PaymentsReportPage() {
  await requireRole(ADMIN_ONLY);

  const report = await getPaymentsReportData();
  const { stats, methodSplit, weeklyConfirmed, rows } = report;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Reports", href: "/console/report" }, { label: "Payments" }]}
        action={
          <ReportExportActions
            filenamePrefix="kip-payments-report"
            summary={buildPaymentsSummary(report)}
            csv={{ columns: EXPORT_COLUMNS, rows: rows as unknown as Record<string, unknown>[] }}
          />
        }
      />
      <PrintHeading title="KIP Payments & Fees Report" meta={`Generated ${report.generatedAt}`} />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="Payments Confirmed" value={stats.confirmedCount} icon={CheckCircle2} />
        <MiniStat label="Fees Collected" value={stats.feesCollected} icon={DollarSign} />
        <MiniStat label="Awaiting Confirmation" value={stats.pendingCount} icon={Hourglass} />
        <MiniStat label="Proof Uploaded" value={stats.proofUploadedCount} icon={FileWarning} />
        <MiniStat label="Unconfirmed > 7 Days" value={stats.agingOver7} icon={AlarmClock} />
        <MiniStat
          label="Avg Days to Confirm"
          value={stats.avgLagDays == null ? "—" : `${stats.avgLagDays}d`}
          icon={Timer}
        />
      </div>

      {/* ── Trend + method split ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Confirmed Payments per Week" dot="bg-green-500">
            <TrendBars buckets={weeklyConfirmed} accent="bg-green-500" caption="Confirmed payments per week" />
          </Panel>
        </div>
        <Panel title="By Method" dot="bg-blue-500">
          <BarList rows={methodSplit} accent="bg-blue-500" empty="No payments yet." />
        </Panel>
      </div>

      {/* ── Detail table ── */}
      <Panel title={`Payment Detail (${rows.length})`} dot="bg-ink-400">
        <ReportTable
          columns={TABLE_COLUMNS}
          rows={rows as unknown as Record<string, unknown>[]}
          searchKeys={["company", "reference", "method", "status"]}
          searchPlaceholder="Search company, reference, status…"
          empty="No payments recorded yet."
        />
      </Panel>
    </>
  );
}
