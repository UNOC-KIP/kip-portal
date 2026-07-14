import { Users, FileText, DollarSign, UserPlus, CheckCircle2, Clock, Award, MapPin } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Panel, BarList, MiniStat, FunnelBars, PrintHeading } from "@/components/report/report-ui";
import { ReportExportActions } from "@/components/report/export-actions";
import { InvestorReportTable } from "./investor-report-table";
import { getReportData } from "@/lib/admin/queries";
import { buildOnboardingSummary, INVESTOR_EXPORT_COLUMNS } from "@/lib/report-export";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

export default async function InvestorsReportPage() {
  await requireRole(ADMIN_ONLY);

  const report = await getReportData();
  const { stats, byCountry, bySector, byCompanyType, conversionFunnel, investors } = report;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Reports", href: "/console/report" }, { label: "Investor Onboarding" }]}
        action={
          <ReportExportActions
            filenamePrefix="kip-investor-onboarding"
            summary={buildOnboardingSummary(report)}
            csv={{ columns: INVESTOR_EXPORT_COLUMNS, rows: investors as unknown as Record<string, unknown>[] }}
          />
        }
      />
      <PrintHeading
        title="KIP Investor Onboarding Report"
        meta={`Generated ${report.generatedAt}${report.windowName ? ` · Window: ${report.windowName}` : ""}`}
      />

      {/* ── Headline KPIs ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Registered Investors"
          value={stats.totalRegistered}
          subtext={`${stats.activeAccounts} active · ${stats.pendingAccounts} pending`}
          highlight
          icon={Users}
        />
        <StatCard
          label="New (Last 30 Days)"
          value={stats.newLast30Days}
          subtext={`${stats.newLast7Days} in the last 7 days`}
          icon={UserPlus}
        />
        <StatCard
          label="Payments Confirmed"
          value={stats.paymentsConfirmed}
          subtext="Investors past the fee gate"
          icon={CheckCircle2}
        />
        <StatCard
          label="Fees Collected"
          value={stats.feesCollected}
          subtext="Confirmed payments"
          icon={DollarSign}
        />
      </div>

      {/* ── Secondary metric strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="EOIs Submitted" value={stats.eoisSubmitted} icon={FileText} />
        <MiniStat label="Shortlisted" value={stats.shortlisted} icon={CheckCircle2} />
        <MiniStat label="Allocated" value={stats.allocated} icon={Award} />
        <MiniStat label="Site Visits" value={stats.siteVisitsRequested} icon={MapPin} />
        <MiniStat label="Pending Accounts" value={stats.pendingAccounts} icon={Clock} />
        <MiniStat label="Days to Window Close" value={stats.daysToClose ?? "—"} icon={Clock} />
      </div>

      {/* ── Funnel ── */}
      <Panel title="Onboarding Funnel" dot="bg-violet-500">
        <FunnelBars rows={conversionFunnel} empty="No investors registered yet." />
      </Panel>

      {/* ── Breakdowns ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="By Country" dot="bg-brand-500">
          <BarList rows={byCountry} accent="bg-brand-500" empty="No registrations yet." />
        </Panel>
        <Panel title="By Business Sector" dot="bg-blue-500">
          <BarList rows={bySector} accent="bg-blue-500" empty="No registrations yet." />
        </Panel>
        <Panel title="By Company Type" dot="bg-teal-500">
          <BarList rows={byCompanyType} accent="bg-teal-500" empty="No registrations yet." />
        </Panel>
      </div>

      {/* ── Investor detail table ── */}
      <div className="rounded-xl border border-ink-300 bg-white shadow-sm print:break-inside-avoid">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-ink-400" />
            <h2 className="text-sm font-bold text-ink-900">Investor Onboarding Detail</h2>
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
              {investors.length} investor{investors.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="p-4">
          <InvestorReportTable data={investors} />
        </div>
      </div>
    </>
  );
}
