import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  AuditTrailPanel,
  ClarificationsPanel,
  DecisionLogPanel,
  GateNotice,
  Panel,
} from "@/components/committee/committee-panels";
import { getAdminApplicationDetail } from "@/lib/admin/queries";
import { getCommitteeContext } from "@/lib/admin/committee-queries";
import { statusBadgeProps } from "@/lib/application-data";
import { requireRole } from "@/lib/rbac-server";
import { TC_ROLES } from "@/lib/rbac";
import { ApplicationReviewBody } from "../../applications/application-review-body";
import { ExportEoiLink } from "../../applications/export-eoi-link";
import { TcDecisionForm } from "./tc-decision-form";
import { AiScreeningButton } from "./ai-screening-button";

export const dynamic = "force-dynamic";

// Access (TC_MEMBER / TC_CHAIR / ADMIN) is also enforced by the tc/ layout guard.
export default async function TcReviewPage({ params }: { params: { ref: string } }) {
  const { session } = await requireRole(TC_ROLES);
  const ref = decodeURIComponent(params.ref);
  const app = await getAdminApplicationDetail(ref);
  if (!app) notFound();

  const committee = await getCommitteeContext(app.id, app.status, session.user.id);
  const badge = statusBadgeProps(app.status);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "TC Review Queue", href: "/console/tc/queue" },
            { label: app.reference ?? ref },
          ]}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <ExportEoiLink href={`/console/tc/${encodeURIComponent(ref)}/export`} />
              <AiScreeningButton />
              <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
            </div>
          }
        />

        <div className="mb-2">
          <h1 className="text-2xl font-bold">{app.reference ?? ref}</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {app.orgName}
            {app.plots.length > 0 && ` · ${app.totalAcres.toFixed(2)} acres · ${app.plots.length} plot${app.plots.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <ApplicationReviewBody app={app} />
          </div>

          <div className="min-w-0 space-y-4">
            <Panel title="TC decision">
              {committee.tcGate.open ? (
                <TcDecisionForm applicationId={app.id} />
              ) : (
                <GateNotice reason={committee.tcGate.reason ?? "The TC cannot act on this application."} />
              )}
            </Panel>
            <ClarificationsPanel items={committee.clarifications} />
            <DecisionLogPanel entries={committee.decisionLog} />
            <AuditTrailPanel items={app.auditTrail} />
          </div>
        </div>
      </main>
    </div>
  );
}
