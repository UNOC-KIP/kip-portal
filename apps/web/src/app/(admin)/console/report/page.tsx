import { Users, FileText, DollarSign, MapPin, Inbox, Clock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Panel, MiniStat, FunnelBars, TrendBars, PrintHeading } from "@/components/report/report-ui";
import { ReportExportActions } from "@/components/report/export-actions";
import { getOverviewReportData } from "@/lib/admin/queries";
import { buildOverviewSummary } from "@/lib/report-export";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

export default async function ReportOverviewPage() {
  await requireRole(ADMIN_ONLY);

  const report = await getOverviewReportData();
  const { stats, trends, funnel } = report;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Reports", href: "/console/report" }, { label: "Overview" }]}
        action={
          <ReportExportActions
            filenamePrefix="kip-portal-overview"
            summary={buildOverviewSummary(report)}
          />
        }
      />
      <PrintHeading
        title="KIP Portal Performance Overview"
        meta={`Generated ${report.generatedAt}${report.windowName ? ` · Window: ${report.windowName}` : ""}`}
      />

      {/* ── Headline KPIs ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="Registered Investors" value={stats.investors} icon={Users} />
        <MiniStat label="EOIs Submitted" value={stats.eoisSubmitted} icon={FileText} />
        <MiniStat label="Fees Collected" value={stats.feesCollected} icon={DollarSign} />
        <MiniStat label="Site-Visit Requests" value={stats.siteVisits} icon={MapPin} />
        <MiniStat label="Open Inquiries" value={stats.openInquiries} icon={Inbox} />
        <MiniStat label="Days to Window Close" value={stats.daysToClose ?? "—"} icon={Clock} />
      </div>

      {/* ── 12-week trends ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Investor Registrations" dot="bg-brand-500">
          <TrendBars buckets={trends.registrations} accent="bg-brand-500" caption="New investor accounts per week" />
        </Panel>
        <Panel title="EOI Submissions" dot="bg-blue-500">
          <TrendBars buckets={trends.submissions} accent="bg-blue-500" caption="Applications submitted per week" />
        </Panel>
        <Panel title="Confirmed Payments" dot="bg-green-500">
          <TrendBars buckets={trends.payments} accent="bg-green-500" caption="Payments confirmed per week" />
        </Panel>
      </div>

      {/* ── Funnel ── */}
      <Panel title="Registration → Allocation Funnel" dot="bg-violet-500">
        <FunnelBars rows={funnel} empty="No investors registered yet." />
      </Panel>
    </>
  );
}
