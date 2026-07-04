import { FileText, Users, DollarSign, Calendar } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { ApplicationsTable } from "../applications/applications-table";
import { getReportData } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

export default async function ReportPage() {
  await requireRole(ADMIN_ONLY);

  const report = await getReportData();
  const { stats, byCountry, conversionFunnel, applications } = report;

  const byCountryMax = Math.max(1, byCountry[0]?.count ?? 1);
  const funnelMax    = Math.max(1, stats.totalRegistered);

  return (
    <div className="flex min-h-screen flex-col bg-ink-100">
      <AdminTopbar />
      <main className="flex-1 p-6 space-y-5">
        <PageHeader
          crumbs={[{ label: "Dashboard", href: "/console" }, { label: "Pipeline Report" }]}
          action={
            <Button variant="outline" size="sm" className="gap-2">
              <FileText size={14} /> Export
            </Button>
          }
        />

        {/* ── KPI Stat Cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Registered"
            value={stats.totalRegistered}
            subtext="Investor accounts"
            highlight
            icon={Users}
          />
          <StatCard
            label="EOIs Submitted"
            value={stats.eoisSubmitted}
            subtext="Past the submission gate"
            icon={FileText}
          />
          <StatCard
            label="Fees Collected"
            value={stats.feesCollected}
            subtext="Confirmed payments"
            icon={DollarSign}
          />
          <StatCard
            label="Days to Window Close"
            value={stats.daysToClose ?? "—"}
            subtext={stats.daysToClose === null ? "No open window" : "Remaining"}
            icon={Calendar}
          />
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Applications by Country */}
          <div className="rounded-xl border border-ink-300 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              <h2 className="text-sm font-bold text-ink-900">Applications by Country</h2>
            </div>
            {byCountry.length === 0 ? (
              <p className="text-sm text-ink-400">No registrations yet.</p>
            ) : (
              <div className="space-y-3">
                {byCountry.map((row) => (
                  <div key={row.country} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-xs text-ink-500">{row.country}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${Math.max(4, (row.count / byCountryMax) * 100)}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-bold text-ink-700">{row.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conversion Funnel */}
          <div className="rounded-xl border border-ink-300 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              <h2 className="text-sm font-bold text-ink-900">Conversion Funnel</h2>
            </div>
            {stats.totalRegistered === 0 ? (
              <p className="text-sm text-ink-400">No data yet.</p>
            ) : (
              <div className="space-y-4">
                {conversionFunnel.map((row, i) => {
                  const colors = ["bg-slate-400", "bg-blue-500", "bg-violet-500"];
                  return (
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
                          className={`h-full rounded-full transition-all ${colors[i] ?? "bg-ink-400"}`}
                          style={{ width: row.count === 0 ? "0%" : `${Math.max(4, (row.count / funnelMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── All Applications Table ── */}
        <div className="rounded-xl border border-ink-300 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ink-400" />
              <h2 className="text-sm font-bold text-ink-900">All Applications</h2>
              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                {applications.length} total
              </span>
            </div>
          </div>
          <div className="p-4">
            {applications.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-400">No applications yet.</p>
            ) : (
              <ApplicationsTable data={applications} />
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
