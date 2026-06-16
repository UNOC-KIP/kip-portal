import { FileText } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

const STATS = [
  { label: "Total Registered", value: "47",       change: "+2.5%", highlight: true  },
  { label: "EOIs Submitted",   value: "22",       change: "+2.5%", highlight: false },
  { label: "Fees Collected",   value: "USD 31K",  change: "+2.5%", highlight: false },
  { label: "Days to Close",    value: "68",       change: "",       highlight: false },
];

const BY_COUNTRY = [
  { label: "Uganda", count: 32, max: 32, color: "bg-brand-500" },
  { label: "Kenya",  count: 7,  max: 32, color: "bg-red-400"   },
  { label: "UAE",    count: 5,  max: 32, color: "bg-red-500"   },
  { label: "Other",  count: 3,  max: 32, color: "bg-brand-300" },
];

const FUNNEL = [
  { label: "Registered",    count: 47, max: 47, color: "bg-brand-500" },
  { label: "Payment done",  count: 31, max: 47, color: "bg-red-400"   },
  { label: "EOI Submitted", count: 22, max: 47, color: "bg-red-500"   },
];

export default async function ReportPage() {
  await requireRole(ADMIN_ONLY);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[{ label: "Dashboard", href: "/console" }, { label: "Pipeline Report" }]}
          action={
            <Button variant="outline" size="sm" className="gap-2">
              <FileText size={14} /> Export
            </Button>
          }
        />

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              change={s.change || undefined}
              highlight={s.highlight}
              icon={FileText}
            />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Applications by Country */}
          <div className="rounded-xl border border-ink-300 bg-white p-5">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              <h2 className="text-base font-bold">Applications by Country</h2>
            </div>
            <div className="space-y-4">
              {BY_COUNTRY.map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-16 text-sm text-ink-500">{row.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full rounded-full transition-all ${row.color}`}
                      style={{ width: `${(row.count / row.max) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm font-bold text-ink-700">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="rounded-xl border border-ink-300 bg-white p-5">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              <h2 className="text-base font-bold">Conversion Funnel</h2>
            </div>
            <div className="space-y-4">
              {FUNNEL.map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-ink-500">{row.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full rounded-full transition-all ${row.color}`}
                      style={{ width: `${(row.count / row.max) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm font-bold text-ink-700">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
