import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  User as UserIcon,
  MapPin,
  Wallet,
  FileText,
  Receipt,
} from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { getFinanceApplicationDetail } from "@/lib/admin/finance-queries";
import { requireRole } from "@/lib/rbac-server";
import { FINANCE_ROLES } from "@/lib/rbac";
import {
  formatMoney,
  COMPANY_TYPE_LABELS,
  BUSINESS_SECTOR_LABELS,
  type CompanyType,
  type BusinessSector,
} from "@kip/shared";
import { ProofDownloadButton } from "./proof-download-button";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Kampala",
  });
}

/** Display label for a stored enum value, falling back to the raw value. */
function labelFor<T extends string>(
  map: Record<T, string>,
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return map[value as T] ?? value;
}

/** A labelled read-only value row. */
function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-ink-100 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</span>
      <span className="text-sm text-ink-900 sm:text-right">{value?.trim() ? value : "—"}</span>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-ink-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900">
        <Icon size={16} className="text-ink-500" /> {title}
      </h2>
      {children}
    </section>
  );
}

const PAY_PILL: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  PROOF_UPLOADED: "bg-amber-100 text-amber-700",
  PENDING: "bg-ink-100 text-ink-600",
};
const PAY_LABEL: Record<string, string> = {
  CONFIRMED: "Paid & verified",
  FAILED: "Payment failed",
  PROOF_UPLOADED: "Receipt awaiting verification",
  PENDING: "Awaiting payment",
};

export default async function FinanceApplicationDetailPage({
  params,
}: {
  params: { applicationId: string };
}) {
  await requireRole(FINANCE_ROLES);
  const d = await getFinanceApplicationDetail(params.applicationId);
  if (!d) notFound();

  const payStatus = d.paymentStatus ?? "PENDING";

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="mx-auto w-full max-w-4xl flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Finance", href: "/console/finance" },
            { label: "Payments & invoices", href: "/console/finance/queue" },
            { label: d.reference ?? "Application" },
          ]}
        />

        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              href="/console/finance/queue"
              className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-900"
            >
              <ArrowLeft size={13} /> Back to payments &amp; invoices
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">
              {d.company?.legalName ?? d.applicant.name ?? "Applicant"}
            </h1>
            <p className="mt-0.5 text-sm text-ink-500">
              {d.reference ? `Ref ${d.reference} · ` : ""}Submitted {fmtDate(d.submittedAt)}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${PAY_PILL[payStatus] ?? PAY_PILL.PENDING}`}
          >
            {PAY_LABEL[payStatus] ?? payStatus}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card icon={UserIcon} title="Applicant (representative)">
            <Row label="Name" value={d.applicant.name} />
            <Row label="Designation" value={d.applicant.designation} />
            <Row label="Email" value={d.applicant.email} />
            <Row label="Phone" value={d.applicant.phone} />
          </Card>

          <Card icon={Building2} title="Company profile">
            <Row label="Legal name" value={d.company?.legalName ?? null} />
            <Row label="Trading name" value={d.company?.tradingName ?? null} />
            <Row label="TIN" value={d.company?.tin ?? null} />
            <Row
              label="Company type"
              value={labelFor<CompanyType>(COMPANY_TYPE_LABELS, d.company?.companyType)}
            />
            <Row
              label="Business sector"
              value={labelFor<BusinessSector>(BUSINESS_SECTOR_LABELS, d.company?.businessSector)}
            />
            <Row label="Registration no." value={d.company?.registrationNumber ?? null} />
            <Row label="URSB no." value={d.company?.ursbRegistrationNumber ?? null} />
            <Row label="Country of incorporation" value={d.company?.countryOfIncorporation ?? null} />
            <Row label="Company email" value={d.company?.email ?? null} />
            <Row label="Company phone" value={d.company?.phone ?? null} />
            <Row label="Registered address" value={d.company?.address ?? null} />
          </Card>

          <Card icon={MapPin} title={`Plots applied for (${d.plots.length})`}>
            {d.plots.length === 0 ? (
              <p className="text-sm text-ink-500">No plots recorded.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {d.plots.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 py-2 text-sm">
                    <span className="font-medium text-ink-900">
                      {p.plotName ?? "Plot"}
                      {p.zone ? <span className="text-ink-500"> · {p.zone}</span> : null}
                    </span>
                    <span className="text-right text-ink-500">
                      {p.acreage != null ? `${p.acreage.toFixed(2)} acres` : ""}
                      {p.road ?? p.street ? ` · ${p.road ?? p.street}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card icon={Wallet} title="Fee & payment">
            <div className="mb-3 rounded-lg border border-ink-200 bg-ink-50/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Subtotal</span>
                <span className="text-ink-900">{formatMoney(d.subtotal, d.currency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">VAT (18%)</span>
                <span className="text-ink-900">{formatMoney(d.vat, d.currency)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-ink-200 pt-1 text-sm font-bold">
                <span className="text-ink-900">Total</span>
                <span className="text-ink-900">{formatMoney(d.total, d.currency)}</span>
              </div>
            </div>
            <Row
              label="Invoice"
              value={
                d.invoiceStatus === "SENT"
                  ? `Sent ${d.invoiceSentAt ? fmtDate(d.invoiceSentAt) : ""}`.trim()
                  : "Not sent"
              }
            />
            <Row label="Payment status" value={PAY_LABEL[payStatus] ?? payStatus} />
            {d.hasInvoiceDocument && (
              <div className="pt-3">
                <ProofDownloadButton
                  applicationId={d.applicationId}
                  kind="invoice"
                  variant="outline"
                />
              </div>
            )}
          </Card>
        </div>

        {/* Proof of payment */}
        <section className="mt-4 rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900">
            <Receipt size={16} className="text-ink-500" /> Proof of payment
          </h2>
          {d.hasProof ? (
            <>
              <div className="mb-4 grid gap-x-4 sm:grid-cols-2">
                <Row label="Bank transfer reference" value={d.transferRef} />
                <Row label="Date paid" value={d.paidAt ? fmtDate(d.paidAt) : null} />
              </div>
              <ProofDownloadButton applicationId={d.applicationId} />
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-500">
              <FileText size={15} /> The applicant hasn&apos;t uploaded a receipt yet.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
