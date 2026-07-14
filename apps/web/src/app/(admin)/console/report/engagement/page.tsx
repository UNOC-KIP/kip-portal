import { MapPin, CalendarCheck, CheckCircle2, Inbox, MailQuestion, BellRing } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Panel, BarList, MiniStat, PrintHeading } from "@/components/report/report-ui";
import { ReportExportActions } from "@/components/report/export-actions";
import { ReportTable, type ReportColumn } from "@/components/report/report-table";
import { getEngagementReportData } from "@/lib/admin/queries";
import { buildEngagementSummary, SITE_VISIT_EXPORT_COLUMNS } from "@/lib/report-export";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";


const VISIT_COLUMNS: ReportColumn[] = [
  { key: "companyName", header: "Company", kind: "bold" },
  { key: "zone", header: "Zone", kind: "text", hideBelow: "md" },
  { key: "landUse", header: "Land Use", kind: "muted", hideBelow: "lg" },
  { key: "acresLabel", header: "Acres", kind: "muted", hideBelow: "md" },
  {
    key: "status",
    header: "Status",
    badge: {
      New: "status-pending",
      Scheduled: "eoi-submitted",
      Completed: "status-active",
      Cancelled: "status-rejected",
    },
  },
  { key: "requestedAt", header: "Requested", kind: "muted", hideBelow: "lg" },
];

const INQUIRY_COLUMNS: ReportColumn[] = [
  { key: "name", header: "Name", kind: "bold" },
  { key: "email", header: "Email", kind: "muted", hideBelow: "md" },
  { key: "channel", header: "Channel", kind: "text", hideBelow: "md" },
  { key: "subject", header: "Subject", kind: "muted", hideBelow: "lg" },
  {
    key: "status",
    header: "Status",
    badge: { New: "status-pending", Responded: "status-active", Closed: "eoi-draft" },
  },
  { key: "receivedAt", header: "Received", kind: "muted", hideBelow: "lg" },
];

export default async function EngagementReportPage() {
  await requireRole(ADMIN_ONLY);

  const report = await getEngagementReportData();
  const { stats, visitsByZone, visitsByLandUse, visitsByStatus, inquiriesByChannel, visits, inquiries } = report;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Reports", href: "/console/report" }, { label: "Engagement" }]}
        action={
          <ReportExportActions
            filenamePrefix="kip-engagement-report"
            summary={buildEngagementSummary(report)}
            csv={{ columns: SITE_VISIT_EXPORT_COLUMNS, rows: visits as unknown as Record<string, unknown>[] }}
          />
        }
      />
      <PrintHeading
        title="KIP Engagement Report — Site Visits & Inquiries"
        meta={`Generated ${report.generatedAt}`}
      />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="Site-Visit Requests" value={stats.totalVisits} icon={MapPin} />
        <MiniStat label="Scheduled" value={stats.scheduledVisits} icon={CalendarCheck} />
        <MiniStat label="Completed" value={stats.completedVisits} icon={CheckCircle2} />
        <MiniStat label="Inquiries" value={stats.totalInquiries} icon={Inbox} />
        <MiniStat label="Open Inquiries" value={stats.openInquiries} icon={MailQuestion} />
        <MiniStat label="Notify-Me Signups" value={stats.signups} icon={BellRing} />
      </div>

      {/* ── Breakdowns ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        <Panel title="Visits by Zone" dot="bg-brand-500">
          <BarList rows={visitsByZone} accent="bg-brand-500" empty="No site visits yet." />
        </Panel>
        <Panel title="Visits by Land Use" dot="bg-blue-500">
          <BarList rows={visitsByLandUse} accent="bg-blue-500" empty="No site visits yet." />
        </Panel>
        <Panel title="Visits by Status" dot="bg-teal-500">
          <BarList rows={visitsByStatus} accent="bg-teal-500" empty="No site visits yet." />
        </Panel>
        <Panel title="Inquiries by Channel" dot="bg-violet-500">
          <BarList rows={inquiriesByChannel} accent="bg-violet-500" empty="No inquiries yet." />
        </Panel>
      </div>

      {/* ── Detail tables ── */}
      <Panel title={`Site-Visit Requests (${visits.length})`} dot="bg-ink-400">
        <ReportTable
          columns={VISIT_COLUMNS}
          rows={visits as unknown as Record<string, unknown>[]}
          searchKeys={["companyName", "contactName", "contactEmail", "zone", "landUse"]}
          searchPlaceholder="Search company, zone, land use…"
          empty="No site visits requested yet."
        />
      </Panel>
      <Panel title={`Inquiries (${inquiries.length})`} dot="bg-ink-400">
        <ReportTable
          columns={INQUIRY_COLUMNS}
          rows={inquiries as unknown as Record<string, unknown>[]}
          searchKeys={["name", "email", "subject", "channel"]}
          searchPlaceholder="Search name, email, subject…"
          empty="No inquiries received yet."
        />
      </Panel>
    </>
  );
}
