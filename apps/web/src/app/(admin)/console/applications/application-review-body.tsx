import { COMPANY_TYPE_LABELS, BUSINESS_SECTOR_LABELS } from "@kip/shared";
import type { AdminApplicationDetail } from "@/lib/admin/queries";
import { ApplicationSectionsView } from "./application-sections-view";
import { DocumentList } from "./document-list";

function labelFor(map: Record<string, string>, value: string | null): string {
  if (!value) return "—";
  return map[value] ?? value;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-ink-500">{label}</span>
      <span className="text-right text-sm font-medium text-ink-900">{value && value.trim() ? value : "—"}</span>
    </div>
  );
}

/**
 * The read-only application a committee reviews: applicant, plots, payment,
 * the six EOI sections and the attachments. Shared by the TC and LAC review
 * pages so both committees see the same record.
 */
export function ApplicationReviewBody({ app }: { app: AdminApplicationDetail }) {
  return (
    <div className="space-y-4">
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
                    {pt.road ? ` · ${pt.road}` : ""}
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

      <ApplicationSectionsView sections={app.sections} />
      <DocumentList documents={app.documents} />
    </div>
  );
}
