import { FileText, Send, Hourglass, Gavel, MessageSquareWarning } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Panel, BarList, MiniStat, PrintHeading } from "@/components/report/report-ui";
import { ReportExportActions } from "@/components/report/export-actions";
import { ReportTable, type ReportColumn } from "@/components/report/report-table";
import { getApplicationsReportData } from "@/lib/admin/queries";
import { buildApplicationsSummary } from "@/lib/report-export";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

const EXPORT_COLUMNS = [
  { header: "Reference", key: "reference" },
  { header: "Company", key: "company" },
  { header: "Country", key: "country" },
  { header: "Stage", key: "stage" },
  { header: "Submitted", key: "submitted" },
  { header: "Days in Stage", key: "ageLabel" },
];

const TABLE_COLUMNS: ReportColumn[] = [
  { key: "reference", header: "Reference", kind: "mono" },
  { key: "company", header: "Company", kind: "bold" },
  { key: "country", header: "Country", kind: "muted", hideBelow: "md" },
  { key: "stage", header: "Stage", kind: "text" },
  { key: "submitted", header: "Submitted", kind: "muted", hideBelow: "md" },
  { key: "ageLabel", header: "Age", kind: "muted", hideBelow: "lg" },
];

export default async function ApplicationsReportPage() {
  await requireRole(ADMIN_ONLY);

  const report = await getApplicationsReportData();
  const { stats, byStatus, decisions, stageDurations, rows } = report;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Reports", href: "/console/report" }, { label: "Applications" }]}
        action={
          <ReportExportActions
            filenamePrefix="kip-applications-report"
            summary={buildApplicationsSummary(report)}
            csv={{ columns: EXPORT_COLUMNS, rows: rows as unknown as Record<string, unknown>[] }}
          />
        }
      />
      <PrintHeading
        title="KIP Applications & Review Pipeline Report"
        meta={`Generated ${report.generatedAt}`}
      />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MiniStat label="Total Applications" value={stats.total} icon={FileText} />
        <MiniStat label="Submitted" value={stats.submitted} icon={Send} />
        <MiniStat label="In Review" value={stats.inReview} icon={Hourglass} />
        <MiniStat label="Decided" value={stats.decided} icon={Gavel} />
        <MiniStat label="Clarifications Raised" value={stats.clarifications} icon={MessageSquareWarning} />
      </div>

      {/* ── Pipeline breakdowns ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="By Stage" dot="bg-blue-500">
          <BarList rows={byStatus} accent="bg-blue-500" empty="No applications yet." />
        </Panel>
        <Panel title="Committee Decisions" dot="bg-violet-500">
          <BarList rows={decisions} accent="bg-violet-500" empty="No decisions recorded yet." />
        </Panel>
        <Panel title="Average Days per Stage" dot="bg-brand-500">
          <div className="space-y-4">
            {stageDurations.map((d) => (
              <div key={d.label} className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-ink-600">{d.label}</span>
                <span className="whitespace-nowrap text-sm font-bold text-ink-900">
                  {d.days == null ? (
                    <span className="font-normal text-ink-400">no data yet</span>
                  ) : (
                    <>
                      {d.days}d <span className="text-[10px] font-normal text-ink-400">({d.samples} apps)</span>
                    </>
                  )}
                </span>
              </div>
            ))}
            <p className="border-t border-ink-100 pt-3 text-[11px] text-ink-400">
              Mined from the append-only review audit log.
            </p>
          </div>
        </Panel>
      </div>

      {/* ── Detail table ── */}
      <Panel title={`Application Detail (${rows.length})`} dot="bg-ink-400">
        <ReportTable
          columns={TABLE_COLUMNS}
          rows={rows as unknown as Record<string, unknown>[]}
          searchKeys={["reference", "company", "country", "stage"]}
          searchPlaceholder="Search reference, company, stage…"
          empty="No applications yet."
        />
      </Panel>
    </>
  );
}
