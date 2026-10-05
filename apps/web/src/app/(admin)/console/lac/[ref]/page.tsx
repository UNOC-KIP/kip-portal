import { notFound } from "next/navigation";
import { LAC_DECISION_ROLES, LAC_REVIEW_ROLES } from "@kip/shared";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  AuditTrailPanel,
  ClarificationsPanel,
  DecisionLogPanel,
  GateNotice,
  LacReviewsPanel,
  Panel,
} from "@/components/committee/committee-panels";
import { getAdminApplicationDetail } from "@/lib/admin/queries";
import { getCommitteeContext } from "@/lib/admin/committee-queries";
import { statusBadgeProps } from "@/lib/application-data";
import { requireRole } from "@/lib/rbac-server";
import { LAC_ROLES } from "@/lib/rbac";
import { ApplicationReviewBody } from "../../applications/application-review-body";
import { LacDecisionForm, LacReviewForm } from "./lac-forms";

export const dynamic = "force-dynamic";

// Access (LAC_MEMBER / ADMIN) is also enforced by the lac/ layout guard.
export default async function LacReviewPage({ params }: { params: { ref: string } }) {
  const { session, role } = await requireRole(LAC_ROLES);
  const ref = decodeURIComponent(params.ref);
  const app = await getAdminApplicationDetail(ref);
  if (!app) notFound();

  const committee = await getCommitteeContext(app.id, app.status, session.user.id);
  const badge = statusBadgeProps(app.status);
  const gate = committee.lacGate;
  const isMember = LAC_REVIEW_ROLES.includes(role);
  const canDecide = LAC_DECISION_ROLES.includes(role);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "LAC Review Queue", href: "/console/lac/queue" },
            { label: app.reference ?? ref },
          ]}
          action={<StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>}
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
            {!gate.open && <GateNotice reason={gate.reason ?? "The LAC cannot act on this application."} />}

            <LacReviewsPanel reviews={committee.lacReviews} tally={committee.lacTally} />

            {gate.open && isMember && (
              <Panel title="Your review">
                <LacReviewForm applicationId={app.id} initial={committee.myLacReview} />
              </Panel>
            )}

            {gate.open && canDecide && (
              <Panel title="Committee decision" className="border-2">
                {committee.lacTally.total === 0 && (
                  <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    No member has recorded a recommendation yet. Record the decision only once the committee has agreed.
                  </p>
                )}
                <LacDecisionForm applicationId={app.id} />
              </Panel>
            )}

            <ClarificationsPanel items={committee.clarifications} />
            <DecisionLogPanel entries={committee.decisionLog} />
            <AuditTrailPanel items={app.auditTrail} />
          </div>
        </div>
      </main>
    </div>
  );
}
