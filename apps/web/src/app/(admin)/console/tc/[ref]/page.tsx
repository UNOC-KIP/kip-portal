import { notFound } from "next/navigation";
import { COMPANY_TYPE_LABELS, BUSINESS_SECTOR_LABELS } from "@kip/shared";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getAdminApplicationDetail } from "@/lib/admin/queries";
import { statusBadgeProps } from "@/lib/application-data";
import { ApplicationSectionsView } from "../../applications/application-sections-view";
import { DocumentList } from "../../applications/document-list";
import { TcDecisionForm } from "./tc-decision-form";
import { AiScreeningButton } from "./ai-screening-button";

function labelFor(map: Record<string, string>, value: string | null): string {
  if (!value) return "—";
  return map[value] ?? value;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-ink-500">{label}</span>
      <span className="text-sm font-medium text-ink-900">{value && value.trim() ? value : "—"}</span>
    </div>
  );
}

// Access (TC_MEMBER / TC_CHAIR / ADMIN) is enforced by the tc/ layout guard.
export default async function TcReviewPage({ params }: { params: { ref: string } }) {
  const ref = decodeURIComponent(params.ref);
  const app = await getAdminApplicationDetail(ref);
  if (!app) notFound();

  const badge = statusBadgeProps(app.status);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "TC Review Queue", href: "/console/tc/queue" },
            { label: app.reference ?? ref },
          ]}
          action={
            <div className="flex flex-wrap items-center gap-2">
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
          <div className="space-y-4 lg:col-span-2">
            {/* Applicant & company */}
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink-700">Applicant &amp; Company</h2>
              {app.owner ? (
                <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                  <div className="divide-y divide-ink-100">
                    <Row label="Representative" value={app.owner.name} />
                    <Row label="Email" value={app.owner.email} />
                    <Row label="Phone" value={app.owner.phone} />
                  </div>
                  <div className="divide-y divide-ink-100">
                    <Row label="Company" value={app.org?.legalName} />
                    <Row label="Type" value={labelFor(COMPANY_TYPE_LABELS as Record<string, string>, app.org?.companyType ?? null)} />
                    <Row label="Sector" value={labelFor(BUSINESS_SECTOR_LABELS as Record<string, string>, app.org?.businessSector ?? null)} />
                    <Row label="Country" value={app.org?.countryOfIncorporation} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-500">No applicant on record.</p>
              )}
            </div>

            {/* Plots */}
            {app.plots.length > 0 && (
              <div className="rounded-xl border border-ink-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-ink-700">Plots of Interest</h2>
                  <span className="text-xs font-semibold text-ink-500">
                    {app.plots.length} plot{app.plots.length === 1 ? "" : "s"} · {app.totalAcres.toFixed(2)} acres
                  </span>
                </div>
                <div className="space-y-2">
                  {app.plots.map((pt) => (
                    <div key={pt.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-900">{pt.plotName}</p>
                        <p className="text-xs text-ink-500">
                          {pt.zone ?? "—"} · {pt.acreage != null ? `${pt.acreage.toFixed(2)} acres` : "—"}
                        </p>
                      </div>
                      {pt.applicantCount > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          {pt.applicantCount} other{pt.applicantCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment */}
            {app.payment && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <h2 className="mb-4 text-sm font-bold text-ink-700">Payment Record</h2>
                <div className="divide-y divide-green-200">
                  {[
                    ["Method", app.payment.method],
                    ["Amount", app.payment.amountLabel],
                    ["Reference", app.payment.ref],
                    ["Confirmed", app.payment.confirmedAt],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between py-2.5">
                      <span className="text-xs text-ink-500">{label}</span>
                      <span className="text-sm font-semibold text-ink-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real submitted EOI content */}
            <ApplicationSectionsView sections={app.sections} />

            {/* Real documents */}
            <DocumentList documents={app.documents} />
          </div>

          {/* Right column: audit + decision */}
          <div className="space-y-4">
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-ink-400" />
                <h2 className="text-sm font-bold">Audit Trail</h2>
              </div>
              {app.auditTrail.length === 0 ? (
                <p className="text-sm text-ink-500">No recorded activity.</p>
              ) : (
                <ol className="relative border-l border-ink-200 pl-4">
                  {app.auditTrail.map((a, i) => (
                    <li key={i} className="mb-5">
                      <p className="text-xs font-semibold text-brand-600">{a.time}</p>
                      <p className="text-sm font-semibold text-ink-900">{a.text}</p>
                      <p className="text-xs text-ink-500">{a.actor}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink-700">TC Decision</h2>
              <TcDecisionForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
