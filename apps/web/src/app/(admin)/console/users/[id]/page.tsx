import { notFound } from "next/navigation";
import { Building2, ShieldCheck, UserRound, AlertTriangle } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, type StatusVariant } from "@/components/status-badge";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { getUserDetail } from "@/lib/admin/queries";
import { UserActionButtons } from "./user-action-buttons";
import { UserManageButtons } from "./user-manage-buttons";
import { ResetPasswordButton } from "./reset-password-button";

function initials(source: string): string {
  const words = source.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-6">
      <h2 className="mb-4 flex items-center gap-2 border-b border-ink-100 pb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
        <Icon size={14} /> {title}
      </h2>
      <dl className="divide-y divide-ink-100">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="min-w-0 shrink-0 text-sm text-ink-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-ink-900">{value}</dd>
    </div>
  );
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(ADMIN_ONLY);
  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();

  const statusVariant: StatusVariant =
    user.rawStatus === "ACTIVE"
      ? "status-active"
      : user.rawStatus === "REJECTED"
        ? "status-rejected"
        : "status-pending";
  const roleVariant: StatusVariant =
    user.role === "Admin"
      ? "role-admin"
      : user.role === "Exco"
        ? "role-exco"
        : user.role.includes("TC") || user.role.includes("LAC")
          ? "role-tc"
          : "role-investor";
  const displayName = user.company !== "—" ? user.company : user.repName !== "—" ? user.repName : user.email;

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 space-y-5 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "Users", href: "/console/users" },
            { label: displayName },
          ]}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {user.rawStatus === "ACTIVE" && (
                <ResetPasswordButton userId={user.id} email={user.email} />
              )}
              <UserManageButtons
                userId={user.id}
                displayName={displayName}
                applicationRef={user.ref !== "—" ? user.ref : null}
                edit={user.edit}
              />
            </div>
          }
        />

        {/* ── Identity header ── */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-ink-200 bg-white p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink-900 text-lg font-bold text-white">
            {initials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-black text-ink-900">{displayName}</h1>
              <StatusBadge variant={roleVariant}>{user.role}</StatusBadge>
              <StatusBadge variant={statusVariant}>{user.status}</StatusBadge>
            </div>
            <p className="mt-1 truncate text-sm text-ink-500">
              {user.repName !== "—" && user.company !== "—" && <>{user.repName} · </>}
              <a
                href={`mailto:${user.email}`}
                className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
              >
                {user.email}
              </a>
              <span className="text-ink-400"> · Registered {user.registeredAt}</span>
            </p>
          </div>
        </div>

        {/* ── Pending review banner ── */}
        {user.rawStatus === "PENDING_REVIEW" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertTriangle size={15} /> This account is awaiting review — approve to email
              sign-in credentials, or reject it.
            </p>
            <UserActionButtons userId={user.id} />
          </div>
        )}

        {/* ── Detail cards ── */}
        <div className={`grid gap-5 ${user.edit.hasOrg ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
          <Card title="Account & Security" icon={ShieldCheck}>
            <Row label="Login Email" value={user.email} />
            <Row label="Role" value={<StatusBadge variant={roleVariant}>{user.role}</StatusBadge>} />
            <Row
              label="Status"
              value={<StatusBadge variant={statusVariant}>{user.status}</StatusBadge>}
            />
            <Row label="Registered" value={user.registeredAt} />
            <Row
              label="Password"
              value={
                user.passwordChangedAt ? (
                  <span>Changed {user.passwordChangedAt}</span>
                ) : (
                  <span className="text-amber-700">Still on emailed password</span>
                )
              }
            />
            {user.isInvestor && (
              <>
                <Row
                  label="EOI Application"
                  value={
                    user.ref !== "—" ? (
                      <span className="font-mono text-xs">{user.ref}</span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )
                  }
                />
                <Row label="EOI Stage" value={user.appStage} />
              </>
            )}
          </Card>

          <Card title="Authorized Representative" icon={UserRound}>
            <Row label="Full Name" value={user.repName} />
            <Row label="Designation / Title" value={user.repDesignation} />
            <Row label="Email (login)" value={user.email} />
            <Row label="Phone" value={user.repPhone} />
          </Card>

          {user.edit.hasOrg && (
            <Card title="Company Information" icon={Building2}>
              <Row label="Legal Name" value={user.company} />
              <Row label="Trading Name" value={user.tradingName} />
              <Row label="Registration No." value={user.registrationNumber} />
              <Row label="URSB Registration No." value={user.ursbRegistrationNumber} />
              <Row label="Company Type" value={user.companyType} />
              <Row label="Primary Sector" value={user.businessSector} />
              <Row label="TIN" value={user.tin} />
              <Row label="Country" value={user.country} />
              <Row label="Address" value={<span className="break-words">{user.address}</span>} />
              <Row label="Company Phone" value={user.phone} />
              <Row label="Company Email" value={user.orgEmail} />
            </Card>
          )}
        </div>

        <p className="text-[11px] text-ink-400">
          Edit updates the representative and company details · Reset Password emails a new
          temporary password to the login address · Delete soft-deletes the account and its
          applications.
        </p>
      </main>
    </div>
  );
}
