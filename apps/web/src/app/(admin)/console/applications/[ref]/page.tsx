import { notFound } from "next/navigation";
import {
  ApplicationStatus,
  FINAL_OUTCOME_STATUSES,
  COMPANY_TYPE_LABELS,
  BUSINESS_SECTOR_LABELS,
} from "@kip/shared";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getAdminApplicationDetail } from "@/lib/admin/queries";
import { statusBadgeProps } from "@/lib/application-data";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { DeleteApplicationButton } from "../delete-application-button";
import { DocumentList } from "../document-list";
import { ApplicationSectionsView } from "../application-sections-view";
import { EditApplicantButton } from "../edit-applicant-button";
import { StatusOverrideControl } from "../status-override-control";
import type { UserEditData } from "../../users/[id]/edit-user-dialog";
import { SectionEditButton } from "./section-edit-button";

function labelFor(map: Record<string, string>, value: string | null): string {
  if (!value) return "—";
  return map[value] ?? value;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[168px_1fr] sm:gap-3">
      <span className="text-xs text-ink-500">{label}</span>
      <span className="text-sm font-medium text-ink-900">{value && value.trim() ? value : "—"}</span>
    </div>
  );
}

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: { ref: string };
}) {
  await requireRole(ADMIN_ONLY);

  const ref = decodeURIComponent(params.ref);
  const app = await getAdminApplicationDetail(ref);
  if (!app) notFound();

  const badge = statusBadgeProps(app.status);
  const pct = app.totalSections > 0 ? (app.sectionsComplete / app.totalSections) * 100 : 0;

  const statusOptions = Object.values(ApplicationStatus).map((v) => ({
    value: v,
    label: statusBadgeProps(v).label,
  }));
  const isFinal = FINAL_OUTCOME_STATUSES.includes(app.status as ApplicationStatus);

  const applicantInitial: UserEditData | null = app.owner
    ? {
        name: app.owner.name ?? "",
        designation: app.owner.designation ?? "",
        phone: app.owner.phone ?? "",
        email: app.owner.email ?? "",
        role: app.owner.role ?? "INVESTOR",
        hasOrg: app.org != null,
        org: {
          legalName: app.org?.legalName ?? "",
          tradingName: app.org?.tradingName ?? "",
          registrationNumber: app.org?.registrationNumber ?? "",
          ursbRegistrationNumber: app.org?.ursbRegistrationNumber ?? "",
          companyType: app.org?.companyType ?? "",
          businessSector: app.org?.businessSector ?? "",
          countryOfIncorporation: app.org?.countryOfIncorporation ?? "",
          tin: app.org?.tin ?? "",
          address: app.org?.address ?? "",
          phone: app.org?.phone ?? "",
          email: app.org?.email ?? "",
        },
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "Applications", href: "/console/applications" },
            { label: app.reference ?? ref },
          ]}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <DeleteApplicationButton
                applicationId={app.id}
                reference={app.reference ?? ref}
                company={app.orgName}
                redirectTo="/console/applications"
              />
              <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
            </div>
          }
        />

        <div className="mb-2">
          <h1 className="text-2xl font-bold">{app.reference ?? ref}</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {app.orgName} · {app.landHa} ha · Lot {app.lotReference}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* Stage & status */}
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-ink-700">Stage</h2>
                <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
              </div>
              <p className="mb-4 text-xs text-ink-500">
                Current stage in the EOI pipeline: <strong className="text-ink-700">{badge.label}</strong>.
              </p>
              <StatusOverrideControl
                applicationId={app.id}
                currentStatus={app.status}
                currentLabel={badge.label}
                options={statusOptions}
                locked={isFinal}
                lockedReason={`This application has a final outcome (${badge.label}) — its stage can no longer be overridden.`}
              />
            </div>

            {/* Plots of interest */}
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
                    <div
                      key={pt.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-900">{pt.plotName}</p>
                        <p className="text-xs text-ink-500">
                          {pt.zone ?? "—"} ·{" "}
                          {pt.acreage != null ? `${pt.acreage.toFixed(2)} acres` : "—"}
                          {pt.road ? ` · ${pt.road}` : ""}
                          {pt.areaCategory ? ` · ${pt.areaCategory}` : ""}
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

            {/* Applicant & company */}
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-ink-700">Applicant &amp; Company</h2>
                {applicantInitial && app.owner && (
                  <EditApplicantButton userId={app.owner.id} initial={applicantInitial} />
                )}
              </div>
              {app.owner ? (
                <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      Authorized Representative
                    </p>
                    <div className="divide-y divide-ink-100">
                      <Row label="Full name" value={app.owner.name} />
                      <Row label="Designation" value={app.owner.designation} />
                      <Row label="Email (login)" value={app.owner.email} />
                      <Row label="Phone" value={app.owner.phone} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      Company
                    </p>
                    <div className="divide-y divide-ink-100">
                      <Row label="Legal name" value={app.org?.legalName} />
                      <Row label="Trading name" value={app.org?.tradingName} />
                      <Row label="Company type" value={labelFor(COMPANY_TYPE_LABELS as Record<string, string>, app.org?.companyType ?? null)} />
                      <Row label="Sector" value={labelFor(BUSINESS_SECTOR_LABELS as Record<string, string>, app.org?.businessSector ?? null)} />
                      <Row label="Registration no." value={app.org?.registrationNumber} />
                      <Row label="URSB no." value={app.org?.ursbRegistrationNumber} />
                      <Row label="TIN" value={app.org?.tin} />
                      <Row label="Country" value={app.org?.countryOfIncorporation} />
                      <Row label="Address" value={app.org?.address} />
                      <Row label="Company phone" value={app.org?.phone} />
                      <Row label="Company email" value={app.org?.email} />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-500">No applicant on record for this application.</p>
              )}
            </div>

            {/* Joint-venture partners */}
            {app.partners.length > 0 && (
              <div className="rounded-xl border border-ink-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-ink-700">Joint-Venture Partners</h2>
                  <span className="text-xs text-ink-500">
                    {app.partners.length} venture{app.partners.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-4">
                  {app.partners.map((pt) => (
                    <div key={pt.id} className="rounded-lg border border-ink-100 bg-ink-50/40 p-4">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="text-sm font-bold text-ink-900">{pt.legalName}</span>
                        {pt.isLead && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                            Lead
                          </span>
                        )}
                      </div>
                      <div className="divide-y divide-ink-100">
                        <Row label="Trading name" value={pt.tradingName} />
                        <Row label="Company type" value={labelFor(COMPANY_TYPE_LABELS as Record<string, string>, pt.companyType)} />
                        <Row label="Sector" value={labelFor(BUSINESS_SECTOR_LABELS as Record<string, string>, pt.businessSector)} />
                        <Row label="Registration no." value={pt.registrationNumber} />
                        <Row label="URSB no." value={pt.ursbRegistrationNumber} />
                        <Row label="TIN" value={pt.tin} />
                        <Row label="Country" value={pt.countryOfIncorporation} />
                        <Row label="Address" value={pt.address} />
                        <Row label="Phone" value={pt.phone} />
                        <Row label="Email" value={pt.email} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment record */}
            {app.payment ? (
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
            ) : (
              <div className="rounded-xl border border-ink-200 bg-white p-5 text-sm text-ink-500">
                No payment on record.
              </div>
            )}

            {/* EOI sections checklist */}
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-ink-700">EOI Sections</h2>
              <div className="space-y-2">
                {app.sections.map((s) => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="text-sm text-ink-700">{s.label}</span>
                    <div className="flex items-center gap-1.5">
                      {s.payload != null && (
                        <SectionEditButton
                          applicationId={app.id}
                          section={s.key}
                          label={s.label}
                          payload={s.payload}
                        />
                      )}
                      <StatusBadge variant={s.complete ? "tc-approved" : "eoi-draft"}>
                        {s.complete ? "Complete" : "Not started"}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-200">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-ink-500">
                {app.sectionsComplete} of {app.totalSections} sections complete
              </p>
            </div>

            {/* Full submitted details */}
            <ApplicationSectionsView sections={app.sections} />

            {/* Documents */}
            <DocumentList documents={app.documents} />
          </div>

          {/* Audit trail */}
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
        </div>
      </main>
    </div>
  );
}
