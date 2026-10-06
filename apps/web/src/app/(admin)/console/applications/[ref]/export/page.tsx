import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMPANY_TYPE_LABELS, BUSINESS_SECTOR_LABELS } from "@kip/shared";
import { getAdminApplicationDetail } from "@/lib/admin/queries";
import { statusBadgeProps } from "@/lib/application-data";
import { formatDateTime } from "@/lib/format";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { ApplicationSectionsView } from "../../application-sections-view";
import { ExportToolbar } from "./export-toolbar";

/**
 * One applicant's EOI as a self-contained, print-ready dossier — applicant,
 * company, joint-venture partners, plots, payment, the six sections exactly as
 * submitted, the attachment register and the audit trail. Exported to PDF
 * through the browser's print dialog (see ExportToolbar), so what is filed is
 * what the console shows: the sections go through the same renderer as the
 * detail page.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { ref: string } }): Promise<Metadata> {
  // The browser suggests the <title> as the PDF filename.
  return { title: `EOI ${decodeURIComponent(params.ref)}` };
}

function labelFor(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "—";
  return map[value] ?? value;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 py-1.5 break-inside-avoid">
      <span className="text-xs text-ink-500">{label}</span>
      <span className="text-sm font-medium text-ink-900">{value && value.trim() ? value : "—"}</span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-ink-200 bg-white p-5 print:rounded-none print:border-0 print:border-t print:px-0">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-700">{title}</h2>
      {children}
    </section>
  );
}

export default async function ApplicationExportPage({ params }: { params: { ref: string } }) {
  await requireRole(ADMIN_ONLY);

  const ref = decodeURIComponent(params.ref);
  const app = await getAdminApplicationDetail(ref);
  if (!app) notFound();

  const status = statusBadgeProps(app.status).label;
  const companyTypes = COMPANY_TYPE_LABELS as Record<string, string>;
  const sectors = BUSINESS_SECTOR_LABELS as Record<string, string>;

  return (
    <main className="mx-auto max-w-4xl p-6 print:max-w-none print:p-0">
      <ExportToolbar backHref={`/console/applications/${encodeURIComponent(ref)}`} />

      <div className="space-y-4 print:space-y-5">
        {/* Cover */}
        <header className="rounded-xl border border-ink-200 bg-white p-6 print:rounded-none print:border-0 print:p-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">
            Kabalega Industrial Park · Expression of Interest
          </p>
          <h1 className="mt-1 font-mono text-2xl font-bold text-ink-900">{app.reference ?? "Draft application"}</h1>
          <p className="mt-0.5 text-base font-semibold text-ink-700">{app.orgName}</p>
          <div className="mt-4 grid grid-cols-2 gap-x-8 sm:grid-cols-4">
            {[
              ["Stage", status],
              ["Submitted", app.submittedAt ?? "Not submitted"],
              ["Sections complete", `${app.sectionsComplete} of ${app.totalSections}`],
              ["Exported", formatDateTime(Date.now())],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
                <p className="text-sm font-medium text-ink-900">{value}</p>
              </div>
            ))}
          </div>
        </header>

        <Block title="Applicant & Company">
          {app.owner ? (
            <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2 print:grid-cols-2">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  Authorized Representative
                </p>
                <Row label="Full name" value={app.owner.name} />
                <Row label="Designation" value={app.owner.designation} />
                <Row label="Email" value={app.owner.email} />
                <Row label="Phone" value={app.owner.phone} />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">Company</p>
                <Row label="Legal name" value={app.org?.legalName} />
                <Row label="Trading name" value={app.org?.tradingName} />
                <Row label="Company type" value={labelFor(companyTypes, app.org?.companyType)} />
                <Row label="Sector" value={labelFor(sectors, app.org?.businessSector)} />
                <Row label="Registration no." value={app.org?.registrationNumber} />
                <Row label="URSB no." value={app.org?.ursbRegistrationNumber} />
                <Row label="TIN" value={app.org?.tin} />
                <Row label="Country" value={app.org?.countryOfIncorporation} />
                <Row label="Address" value={app.org?.address} />
                <Row label="Company phone" value={app.org?.phone} />
                <Row label="Company email" value={app.org?.email} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-500">No applicant on record for this application.</p>
          )}
        </Block>

        {app.partners.length > 0 && (
          <Block title="Joint-Venture Partners">
            <div className="space-y-4">
              {app.partners.map((pt) => (
                <div key={pt.id} className="break-inside-avoid">
                  <p className="mb-1 text-sm font-bold text-ink-900">
                    {pt.legalName}
                    {pt.isLead ? " (Lead)" : ""}
                  </p>
                  <Row label="Trading name" value={pt.tradingName} />
                  <Row label="Company type" value={labelFor(companyTypes, pt.companyType)} />
                  <Row label="Sector" value={labelFor(sectors, pt.businessSector)} />
                  <Row label="Registration no." value={pt.registrationNumber} />
                  <Row label="URSB no." value={pt.ursbRegistrationNumber} />
                  <Row label="TIN" value={pt.tin} />
                  <Row label="Country" value={pt.countryOfIncorporation} />
                  <Row label="Address" value={pt.address} />
                  <Row label="Phone" value={pt.phone} />
                  <Row label="Email" value={pt.email} />
                </div>
              ))}
            </div>
          </Block>
        )}

        <Block title="Plots of Interest">
          {app.plots.length === 0 ? (
            <p className="text-sm text-ink-500">No plots selected.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-xs text-ink-500">
                  <th className="py-1.5 font-semibold">Plot</th>
                  <th className="py-1.5 font-semibold">Zone</th>
                  <th className="py-1.5 font-semibold">Acreage</th>
                  <th className="py-1.5 font-semibold">Road</th>
                  <th className="py-1.5 font-semibold">Other applicants</th>
                </tr>
              </thead>
              <tbody>
                {app.plots.map((pt) => (
                  <tr key={pt.id} className="border-b border-ink-100">
                    <td className="py-1.5 font-medium text-ink-900">{pt.plotName}</td>
                    <td className="py-1.5">{pt.zone ?? "—"}</td>
                    <td className="py-1.5">{pt.acreage != null ? `${pt.acreage.toFixed(2)} acres` : "—"}</td>
                    <td className="py-1.5">{pt.road ?? "—"}</td>
                    <td className="py-1.5">{pt.applicantCount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-xs font-semibold text-ink-700">
                  <td className="pt-2" colSpan={2}>
                    {app.plots.length} plot{app.plots.length === 1 ? "" : "s"}
                  </td>
                  <td className="pt-2" colSpan={3}>
                    {app.totalAcres.toFixed(2)} acres
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </Block>

        <Block title="Application Fee">
          {app.payment ? (
            <>
              <Row label="Method" value={app.payment.method} />
              <Row label="Amount" value={app.payment.amountLabel} />
              <Row label="Reference" value={app.payment.ref} />
              <Row label="Confirmed" value={app.payment.confirmedAt} />
            </>
          ) : (
            <p className="text-sm text-ink-500">No payment on record.</p>
          )}
        </Block>

        <div className="print:border-t print:pt-5 print:[&>div]:rounded-none print:[&>div]:border-0 print:[&>div]:p-0">
          <ApplicationSectionsView sections={app.sections} />
        </div>

        <Block title="Attachments">
          {app.documents.length === 0 ? (
            <p className="text-sm text-ink-500">No attachments uploaded.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-xs text-ink-500">
                  <th className="py-1.5 font-semibold">Document</th>
                  <th className="py-1.5 font-semibold">File</th>
                  <th className="py-1.5 font-semibold">Size</th>
                  <th className="py-1.5 font-semibold">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {app.documents.map((d) => (
                  <tr key={d.id} className="border-b border-ink-100 align-top">
                    <td className="py-1.5 font-medium text-ink-900">
                      {d.kindLabel}
                      {d.partnerName ? <span className="block text-xs text-ink-500">{d.partnerName}</span> : null}
                    </td>
                    <td className="break-all py-1.5">{d.filename}</td>
                    <td className="py-1.5 whitespace-nowrap">{d.sizeLabel}</td>
                    <td className="py-1.5 whitespace-nowrap">{d.uploadedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-ink-400">
            The files themselves are held in the KIP document store and can be downloaded from the application page.
          </p>
        </Block>

        <Block title="Audit Trail">
          {app.auditTrail.length === 0 ? (
            <p className="text-sm text-ink-500">No recorded activity.</p>
          ) : (
            <ol className="space-y-1.5">
              {app.auditTrail.map((a, i) => (
                <li key={i} className="grid grid-cols-[160px_1fr] gap-3 text-sm break-inside-avoid">
                  <span className="text-xs text-ink-500">{a.time}</span>
                  <span className="text-ink-900">
                    {a.text} <span className="text-ink-500">· {a.actor}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Block>
      </div>
    </main>
  );
}
