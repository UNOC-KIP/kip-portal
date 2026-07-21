import { PageHeader } from "@/components/page-header";
import { PrintHeading } from "@/components/report/report-ui";
import { InvestorsReportClient } from "./investors-report-client";
import { getReportData } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

/**
 * Investor Onboarding report. The server does one read and hands the full row
 * set to the client shell, which owns the zone / date / attribute drill-down —
 * see `investors-report-client.tsx` for why the filtering lives in the browser.
 */
export default async function InvestorsReportPage() {
  await requireRole(ADMIN_ONLY);

  const report = await getReportData();

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Reports", href: "/console/report" }, { label: "Investor Onboarding" }]}
      />
      <PrintHeading
        title="KIP Investor Onboarding Report"
        meta={`Generated ${report.generatedAt}${report.windowName ? ` · Window: ${report.windowName}` : ""}`}
      />
      <InvestorsReportClient report={report} />
    </>
  );
}
