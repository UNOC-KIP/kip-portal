import { FileText } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getAdminDashboard } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

const QUICK_ACTIONS = [
  { label: "Manage Window",        href: "/console/windows"        },
  { label: "Land Plot Manager",    href: "/console/land-plots"     },
  { label: "Review Bank Transfer", href: "/console/bank-transfers" },
  { label: "View Reports",         href: "/console/report"         },
];

export default async function AdminConsolePage() {
  // ADMIN-only overview. TC members are sent to their queue, LAC/ExCo to the
  // no-workspace notice, investors to their dashboard (see homePathForRole).
  await requireRole(ADMIN_ONLY);

  const dash = await getAdminDashboard();

  const statCards = [
    { label: "Total Applications",     subtext: "All applications in this round",      value: dash.totalApplications,    highlight: true },
    { label: "Payments Confirmed",     subtext: dash.amountCollectedLabel,             value: dash.paymentsConfirmed,    highlight: false },
    { label: "EOIs Submitted",         subtext: `${dash.draftsInProgress} draft${dash.draftsInProgress === 1 ? "" : "s"} in progress`, value: dash.eoisSubmitted, highlight: false },
    { label: "Bank Transfers Pending", subtext: "Awaiting Finance review",             value: dash.bankTransfersPending, highlight: false },
  ];
  const methodMax = Math.max(1, ...dash.methodSplit.map((m) => m.count));

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "Admin Overview" },
          ]}
        />

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              subtext={card.subtext}
              value={card.value}
              highlight={card.highlight}
              icon={FileText}
              viewAllHref="/console/applications"
            />
          ))}
        </div>

        {/* Charts + Activity */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Payment Method Split */}
          <div className="rounded-xl border border-ink-300 bg-white p-5">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <h2 className="text-base font-bold">Payment Method Split</h2>
            </div>
            <div className="space-y-3">
              {dash.methodSplit.length === 0 ? (
                <p className="text-sm text-ink-500">No confirmed payments yet.</p>
              ) : (
                dash.methodSplit.map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="w-28 text-sm text-ink-500">{m.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${(m.count / methodMax) * 100}%` }}
                      />
                    </div>
                    <span className="w-4 text-right text-sm font-bold text-ink-700">
                      {m.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-ink-300 bg-white p-5">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ink-500" />
              <h2 className="text-base font-bold">Recent Activity</h2>
              <span className="text-xs text-ink-500">
                Current round — Phase 1
              </span>
            </div>
            <ol className="relative border-l border-ink-200 pl-4">
              {dash.activity.length === 0 ? (
                <li className="text-sm text-ink-500">No recent activity.</li>
              ) : (
                dash.activity.map((item, i) => (
                  <li key={i} className="mb-4 last:mb-0">
                    <span className="absolute -left-1 mt-1 h-2 w-2 rounded-full bg-ink-400" />
                    <p className="text-xs text-ink-500">{item.time}</p>
                    <p className="text-sm text-ink-800">{item.text}</p>
                  </li>
                ))
              )}
            </ol>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="rounded-xl border border-ink-300 bg-white py-3 text-center text-sm font-semibold text-ink-700 transition hover:border-ink-500 hover:bg-ink-100"
            >
              {action.label}
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
