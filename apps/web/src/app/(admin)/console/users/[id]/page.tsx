import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { getUserDetail } from "@/lib/admin/queries";
import { UserActionButtons } from "./user-action-buttons";
import { UserManageButtons } from "./user-manage-buttons";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(ADMIN_ONLY);
  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();

  const statusVariant =
    user.rawStatus === "ACTIVE"
      ? "status-active"
      : user.rawStatus === "REJECTED"
        ? "status-rejected"
        : "status-pending";

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "Users", href: "/console/users" },
            { label: user.company },
          ]}
          action={
            <UserManageButtons
              userId={user.id}
              displayName={user.company !== "—" ? user.company : user.email}
              applicationRef={user.ref !== "—" ? user.ref : null}
              edit={user.edit}
            />
          }
        />

        <div className="mt-2 grid gap-6 md:grid-cols-2">
          {/* Account card */}
          <div className="rounded-xl border border-ink-200 bg-white p-6">
            <h2 className="mb-4 border-b border-ink-100 pb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
              Account
            </h2>
            <dl className="divide-y divide-ink-100">
              <DetailRow label="Email" value={user.email} />
              <DetailRow
                label="Role"
                value={
                  <StatusBadge
                    variant={
                      user.role === "Admin"
                        ? "role-admin"
                        : user.role === "Exco"
                          ? "role-exco"
                          : user.role.includes("TC") || user.role.includes("LAC")
                            ? "role-tc"
                            : "role-investor"
                    }
                  >
                    {user.role}
                  </StatusBadge>
                }
              />
              <DetailRow
                label="Account Status"
                value={
                  <StatusBadge variant={statusVariant}>
                    {user.status}
                  </StatusBadge>
                }
              />
              <DetailRow
                label="Application Ref"
                value={
                  user.ref !== "—" ? (
                    <span className="font-mono text-xs">{user.ref}</span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )
                }
              />
              {user.appStatus && (
                <DetailRow label="Application Status" value={user.appStatus} />
              )}
              <DetailRow label="Registered" value={user.registeredAt} />
            </dl>
          </div>

          {/* Company card */}
          <div className="rounded-xl border border-ink-200 bg-white p-6">
            <h2 className="mb-4 border-b border-ink-100 pb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
              Company Information
            </h2>
            <dl className="divide-y divide-ink-100">
              <DetailRow label="Legal Name" value={user.company} />
              <DetailRow label="Trading Name" value={user.tradingName} />
              <DetailRow label="Registration No." value={user.registrationNumber} />
              <DetailRow label="URSB Registration No." value={user.ursbRegistrationNumber} />
              <DetailRow label="Company Type" value={user.companyType} />
              <DetailRow label="Primary Sector" value={user.businessSector} />
              <DetailRow label="TIN" value={user.tin} />
              <DetailRow label="Country of Incorporation" value={user.country} />
              <DetailRow label="Registered Address" value={<span className="break-words">{user.address}</span>} />
              <DetailRow label="Company Phone" value={user.phone} />
              <DetailRow label="Company Email" value={user.orgEmail} />
            </dl>
          </div>

          {/* Authorized representative card */}
          <div className="rounded-xl border border-ink-200 bg-white p-6">
            <h2 className="mb-4 border-b border-ink-100 pb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
              Authorized Representative
            </h2>
            <dl className="divide-y divide-ink-100">
              <DetailRow label="Full Name" value={user.repName} />
              <DetailRow label="Designation / Title" value={user.repDesignation} />
              <DetailRow label="Email (login)" value={user.email} />
              <DetailRow label="Phone" value={user.repPhone} />
            </dl>
          </div>
        </div>

        {/* Approve / Reject — only when pending review */}
        {user.rawStatus === "PENDING_REVIEW" && (
          <div className="mt-0 max-w-lg">
            <UserActionButtons userId={user.id} />
          </div>
        )}
      </main>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="min-w-0 shrink-0 text-sm text-ink-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-ink-900">{value}</dd>
    </div>
  );
}
