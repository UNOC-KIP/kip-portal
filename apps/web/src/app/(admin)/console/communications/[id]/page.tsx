import { notFound } from "next/navigation";
import { CommunicationStatus, DeliveryStatus, renderBodyHtml } from "@kip/shared";
import { getCommunicationDetail } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CommunicationActions } from "./communication-actions";

export default async function CommunicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(ADMIN_ONLY);
  const detail = await getCommunicationDetail(params.id);
  if (!detail) notFound();

  const { communication: c, deliveries } = detail;
  const unsentCount = deliveries.filter((d) => d.rawStatus !== DeliveryStatus.SENT).length;
  const isSending = c.rawStatus === CommunicationStatus.SENDING;

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "Communications", href: "/console/communications" },
            { label: c.subject },
          ]}
          action={
            <CommunicationActions
              communicationId={params.id}
              subject={c.subject}
              failedCount={c.failedCount}
              unsentCount={unsentCount}
              isSending={isSending}
            />
          }
        />

        {/* Identity + roll-up */}
        <div className="mb-6 rounded-xl border border-ink-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-ink-900">{c.subject}</h1>
              <p className="mt-1 text-xs text-ink-500">
                {c.audienceSummary !== "—" ? c.audienceSummary : c.audience} · {c.channel} ·
                Sent by {c.sentBy} · {c.sentAt}
              </p>
            </div>
            <StatusBadge variant={c.statusVariant}>{c.status}</StatusBadge>
          </div>

          {isSending && (
            <p className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-800">
              Still sending — messages go out at about 27 per minute to stay inside the shared
              mailbox limit. Use Refresh to update the counts.
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-ink-100 pt-5 sm:grid-cols-4">
            {[
              ["Recipients", String(c.recipientCount), "text-ink-900"],
              ["Sent", String(c.sentCount), "text-green-700"],
              ["Failed", String(c.failedCount), c.failedCount > 0 ? "text-red-600" : "text-ink-900"],
              [
                "Read in portal",
                String(deliveries.filter((d) => d.readState === "Read").length),
                "text-ink-900",
              ],
            ].map(([label, value, tone]) => (
              <div key={label}>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  {label}
                </dt>
                <dd className={`mt-0.5 text-xl font-bold ${tone}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The message as recipients saw it */}
        <div className="mb-6 rounded-xl border border-ink-200 bg-white p-6">
          <p className="mb-4 text-sm font-bold text-ink-900">Message</p>
          <div className="overflow-hidden rounded-lg border border-ink-200">
            <div className="bg-ink-900 px-5 py-3">
              <p className="text-sm font-bold text-white">UNOC / KIP Investor Portal</p>
            </div>
            <div className="bg-white p-5">
              <p className="mb-4 text-base font-semibold text-ink-900">{c.subject}</p>
              <div
                className="text-sm leading-relaxed text-ink-700"
                // Safe: renderBodyHtml() escapes the authored text before emitting
                // its own tags — see packages/shared/src/communications.ts.
                dangerouslySetInnerHTML={{ __html: renderBodyHtml(detail.body) }}
              />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-ink-400">
            Merge tokens are shown unresolved here — each recipient received their own merged copy.
          </p>
        </div>

        {/* Per-recipient delivery log */}
        <div className="rounded-xl border border-ink-200 bg-white">
          <div className="border-b border-ink-100 px-6 py-4">
            <p className="text-sm font-bold text-ink-900">Delivery log</p>
            <p className="mt-0.5 text-xs text-ink-500">
              One row per recipient, with the reason for any failure.
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Portal</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-ink-900">{d.recipient}</TableCell>
                    <TableCell className="text-ink-500">{d.email}</TableCell>
                    <TableCell>
                      <StatusBadge variant={d.statusVariant}>{d.status}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-ink-500">{d.sentAt}</TableCell>
                    <TableCell className="text-ink-500">{d.readState}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-red-600" title={d.error}>
                      {d.error}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
