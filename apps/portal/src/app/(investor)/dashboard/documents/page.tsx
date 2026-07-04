import { DashboardTopbar } from "@/components/dashboard-topbar";
import { PageHeader } from "@/components/page-header";

export default function DocumentsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />
      <main className="flex-1 p-4 sm:p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Documents" },
          ]}
        />
        <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-2xl">
            📁
          </div>
          <h2 className="text-lg font-bold text-ink-900">Document Library</h2>
          <p className="mt-2 text-sm text-ink-500">
            Your uploaded documents will appear here once your application is underway.
          </p>
        </div>
      </main>
    </div>
  );
}
