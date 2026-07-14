import {
  Users,
  FileText,
  DollarSign,
  UserPlus,
  CheckCircle2,
  Clock,
  Award,
  MapPin,
} from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { InvestorReportTable } from "./investor-report-table";
import { ReportExportActions } from "./report-export-actions";
import { getReportData } from "@/lib/admin/queries";
import type { BreakdownRow } from "@/lib/admin/mappers";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

/** Horizontal bar list for a labelled-count breakdown (country / sector / type). */
function BarList({
  rows,
  accent,
  empty,
}: {
  rows: BreakdownRow[];
  accent: string;
  empty: string;
}) {
  const max = Math.max(1, rows[0]?.count ?? 1);
  if (rows.length === 0) return <p className="text-sm text-ink-400">{empty}</p>;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs text-ink-500" title={row.label}>
            {row.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full ${accent} transition-all`}
              style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-6 text-right text-xs font-bold text-ink-700">{row.count}</span>
        </div>
      ))}
    </div>
  );
}

function Panel({
  title,
  dot,
  children,
}: {
  title: string;
  dot: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-300 bg-white p-5 shadow-sm print:break-inside-avoid">
      <div className="mb-5 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-300 bg-white p-4 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100">
        <Icon size={16} className="text-ink-500" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black leading-none text-ink-900">{value}</p>
        <p className="mt-1 truncate text-[11px] font-medium text-ink-500">{label}</p>
      </div>
    </div>
  );
}

export default async function ReportPage() {
  await requireRole(ADMIN_ONLY);

  const report = await getReportData();
  const { stats, byCountry, bySector, byCompanyType, conversionFunnel, investors } = report;

  const funnelMax = Math.max(1, stats.totalRegistered);
  const funnelColors = ["bg-slate-400", "bg-blue-500", "bg-violet-500", "bg-fuchsia-500", "bg-brand-500"];

  return (
    <div className="flex min-h-screen flex-col bg-ink-100 print:bg-white">
      <AdminTopbar />
      <main className="flex-1 space-y-5 p-6 print:p-0">
        <PageHeader
          crumbs={[{ label: "Dashboard", href: "/console" }, { label: "Investor Onboarding Report" }]}
          action={<ReportExportActions report={report} />}
        />

        {/* Print-only report heading */}
        <div className="hidden print:mb-4 print:block">
          <h1 className="text-xl font-black text-ink-900">KIP Investor Onboarding Report</h1>
          <p className="text-xs text-ink-500">
            Generated {report.generatedAt}
            {report.windowName ? ` · Window: ${report.windowName}` : ""}
          </p>
        </div>

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
          <MiniStat
            label="Days to Window Close"
            value={stats.daysToClose ?? "—"}
            icon={Clock}
          />
        </div>

        {/* ── Funnel ── */}
        <Panel title="Onboarding Funnel" dot="bg-violet-500">
          {stats.totalRegistered === 0 ? (
            <p className="text-sm text-ink-400">No investors registered yet.</p>
          ) : (
            <div className="space-y-4">
              {conversionFunnel.map((row, i) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-ink-600">{row.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink-400">{row.pct}%</span>
                      <span className="w-6 text-right text-xs font-bold text-ink-800">{row.count}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full rounded-full transition-all ${funnelColors[i] ?? "bg-ink-400"}`}
                      style={{ width: row.count === 0 ? "0%" : `${Math.max(4, (row.count / funnelMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
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
      </main>
    </div>
  );
}
