import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getAdminApplicationDetail } from "@/lib/admin/queries";
import { statusBadgeProps } from "@/lib/investor-data";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

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

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard",    href: "/console" },
            { label: "Applications", href: "/console/applications" },
            { label: app.reference ?? ref },
          ]}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm">View all documents</Button>
              <Button variant="outline" size="sm">Download all</Button>
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
            {/* Payment record */}
            {app.payment ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <h2 className="mb-4 text-sm font-bold text-ink-700">Payment Record</h2>
                <div className="divide-y divide-green-200">
                  {[
                    ["Method",     app.payment.method],
                    ["Amount",     app.payment.amountLabel],
                    ["Reference",  app.payment.ref],
                    ["Confirmed",  app.payment.confirmedAt],
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

            {/* EOI sections */}
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-ink-700">EOI Sections</h2>
              <div className="space-y-2">
                {app.sections.map((s) => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="text-sm text-ink-700">{s.label}</span>
                    <StatusBadge variant={s.complete ? "tc-approved" : "eoi-draft"}>
                      {s.complete ? "Complete" : "Not started"}
                    </StatusBadge>
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
