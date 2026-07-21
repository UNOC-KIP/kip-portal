import { PageHeader } from "@/components/page-header";
import { PrintHeading } from "@/components/report/report-ui";
import { SiteVisitsReportClient } from "./site-visits-report-client";
import { getSiteVisitsReportData } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

/**
 * Site Visits report. Server does one read and hands the bookings to the client
 * shell, which owns the zone / date / status drill-down — see
 * `site-visits-report-client.tsx`.
 */
export default async function SiteVisitsReportPage() {
  await requireRole(ADMIN_ONLY);

  const report = await getSiteVisitsReportData();

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Reports", href: "/console/report" }, { label: "Site Visits" }]}
      />
      <PrintHeading
        title="KIP Site-Visit Requests Report"
        meta={`Generated ${report.generatedAt}`}
      />
      <SiteVisitsReportClient visits={report.visits} generatedAt={report.generatedAt} />
    </>
  );
}
