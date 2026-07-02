import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getApplicationDetail, statusBadgeProps } from "@/lib/investor-data";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return (
    new Date(iso).toLocaleString("en-UG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Kampala",
    }) + " EAT"
  );
}

const METHOD_LABELS: Record<string, string> = {
  STANBIC_TRANSFER: "Stanbic Bank Transfer",
  CARD:             "Visa / Mastercard",
};

export default async function ApplicationDetailPage({
  params,
}: {
  params: { ref: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const userId = (session.user as { id: string }).id;
  const app = await getApplicationDetail(userId, params.ref);

  if (!app) notFound();

  const badge = statusBadgeProps(app.status);
  const completedSections = app.sections.filter((s) => s.complete).length;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />
      <main className="flex-1 p-4 sm:p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: params.ref },
          ]}
        />

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{app.reference}</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              {app.orgName} · {app.lotReference}
            </p>
          </div>
          <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {app.payment && (
              <div
                className={`rounded-xl border p-5 ${
                  app.payment.status === "CONFIRMED"
                    ? "border-green-200 bg-green-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <h2 className="mb-4 text-sm font-bold text-ink-700">Payment Record</h2>
                <div className={`divide-y ${app.payment.status === "CONFIRMED" ? "divide-green-200" : "divide-amber-200"}`}>
                  {[
                    { label: "Method",    value: METHOD_LABELS[app.payment.method] ?? app.payment.method },
                    { label: "Amount",    value: `${app.payment.currency} ${parseFloat(app.payment.amount).toLocaleString()}` },
                    { label: "Reference", value: app.payment.transferRef ?? app.payment.gatewayRef ?? "—" },
                    { label: "Confirmed", value: formatDate(app.payment.confirmedAt) },
                    { label: "Status",    value: app.payment.status },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2.5">
                      <span className="text-xs text-ink-500">{label}</span>
                      <span className="text-sm font-semibold text-ink-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-ink-700">EOI Sections</h2>
              <div className="space-y-2">
                {app.sections.map((s) => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="text-sm text-ink-700">{s.label}</span>
                    <StatusBadge variant={s.complete ? "status-active" : "eoi-draft"}>
                      {s.complete ? "Complete" : "Incomplete"}
                    </StatusBadge>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-200">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${(completedSections / app.sections.length) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-ink-500">
                {completedSections} of {app.sections.length} sections complete
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-ink-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ink-400" />
              <h2 className="text-sm font-bold">Audit Trail</h2>
            </div>
            {app.auditTrail.length === 0 ? (
              <p className="text-xs text-ink-500">No activity yet.</p>
            ) : (
              <ol className="relative border-l border-ink-200 pl-4">
                {[...app.auditTrail].reverse().map((a, i) => (
                  <li key={i} className="mb-5">
                    <p className="text-xs font-semibold text-brand-600">
                      {formatDate(a.time)}
                    </p>
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
