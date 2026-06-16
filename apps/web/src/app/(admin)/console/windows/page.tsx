import { Plus } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { listWindows } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

const DOT_COLOR: Record<string, string> = {
  "window-active": "bg-green-500",
  "window-scheduled": "bg-amber-300",
  "window-closed": "bg-ink-300",
};

export default async function WindowsPage() {
  await requireRole(ADMIN_ONLY);

  const windows = await listWindows();

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "Application Window Manager" },
          ]}
          action={
            <Button size="sm" className="gap-2">
              <Plus size={14} /> Create New Window
            </Button>
          }
        />

        <Alert className="mb-5 border-blue-200 bg-blue-50 text-blue-800">
          <AlertDescription>
            Only one window may be active at a time. The close date can be
            extended but not shortened to a past date.
          </AlertDescription>
        </Alert>

        {windows.length === 0 ? (
          <div className="rounded-xl border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            No application windows configured.
          </div>
        ) : (
          <div className="space-y-3">
            {windows.map((w) => (
              <div
                key={w.name}
                className="flex flex-col gap-4 rounded-xl border border-ink-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      w.statusVariant ? DOT_COLOR[w.statusVariant] : "bg-ink-300"
                    }`}
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink-900">{w.name}</p>
                      {w.statusVariant && w.statusLabel && (
                        <StatusBadge variant={w.statusVariant}>
                          {w.statusLabel}
                        </StatusBadge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-500">{w.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
