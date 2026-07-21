import { Inbox, MailQuestion, MessageSquareReply, CheckCircle2, BellRing } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Panel, BarList, MiniStat, PrintHeading } from "@/components/report/report-ui";
import { ReportExportActions } from "@/components/report/export-actions";
import { ReportTable, type ReportColumn } from "@/components/report/report-table";
import { getEngagementReportData } from "@/lib/admin/queries";
import {
  buildEngagementSummary,
  INQUIRY_EXPORT_COLUMNS,
  NOTIFY_SIGNUP_EXPORT_COLUMNS,
} from "@/lib/report-export";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

/**
 * Engagement report — inquiries and notify-me signups. Site-visit requests have
 * their own tab (`/console/report/site-visits`) with a zone drill-down.
 */

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

const SIGNUP_COLUMNS: ReportColumn[] = [
  { key: "email", header: "Email", kind: "bold" },
  { key: "signedUpAt", header: "Signed Up", kind: "muted" },
];

export default async function EngagementReportPage() {
  await requireRole(ADMIN_ONLY);

  const report = await getEngagementReportData();
  const { stats, inquiriesByChannel, inquiriesByStatus, inquiries, signups } = report;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Reports", href: "/console/report" }, { label: "Engagement" }]}
        action={
          <ReportExportActions
            filenamePrefix="kip-engagement-report"
            summary={buildEngagementSummary(report)}
            csv={{
              label: "Inquiries CSV",
              columns: INQUIRY_EXPORT_COLUMNS,
              rows: inquiries as unknown as Record<string, unknown>[],
            }}
            extraCsvs={[
              {
                label: "Notify-me signups CSV",
                filenamePrefix: "kip-notify-signups",
                columns: NOTIFY_SIGNUP_EXPORT_COLUMNS,
                rows: signups as unknown as Record<string, unknown>[],
              },
            ]}
          />
        }
      />
      <PrintHeading
        title="KIP Engagement Report — Inquiries & Signups"
        meta={`Generated ${report.generatedAt}`}
      />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MiniStat label="Inquiries" value={stats.totalInquiries} icon={Inbox} />
        <MiniStat label="Open" value={stats.openInquiries} icon={MailQuestion} />
        <MiniStat label="Responded" value={stats.respondedInquiries} icon={MessageSquareReply} />
        <MiniStat label="Closed" value={stats.closedInquiries} icon={CheckCircle2} />
        <MiniStat label="Notify-Me Signups" value={stats.signups} icon={BellRing} />
      </div>

      {/* ── Breakdowns ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Inquiries by Channel" dot="bg-violet-500">
          <BarList rows={inquiriesByChannel} accent="bg-violet-500" empty="No inquiries yet." />
        </Panel>
        <Panel title="Inquiries by Status" dot="bg-teal-500">
          <BarList rows={inquiriesByStatus} accent="bg-teal-500" empty="No inquiries yet." />
        </Panel>
      </div>

      {/* ── Detail tables ── */}
      <Panel title={`Inquiries (${inquiries.length})`} dot="bg-ink-400">
        <ReportTable
          columns={INQUIRY_COLUMNS}
          rows={inquiries as unknown as Record<string, unknown>[]}
          searchKeys={["name", "email", "subject", "channel"]}
          searchPlaceholder="Search name, email, subject…"
          empty="No inquiries received yet."
        />
      </Panel>
      <Panel title={`Notify-Me Signups (${signups.length})`} dot="bg-ink-400">
        <ReportTable
          columns={SIGNUP_COLUMNS}
          rows={signups as unknown as Record<string, unknown>[]}
          searchKeys={["email"]}
          searchPlaceholder="Search email…"
          empty="No signups yet."
        />
      </Panel>
    </>
  );
}
